import {injectable, inject} from "inversify";
import {sign, verify, VerifyOptions, VerifyCallback} from "jsonwebtoken";
import {readFileSync} from "fs";
import * as path from "path";
import {promisify} from "bluebird";
import {v4 as uuid} from "node-uuid";
import __ from "../config/constants";
import ISessionService from "../interfaces/session-service";
import ICacheService from "../interfaces/cache-service";
import ILogger from "../interfaces/logger";
import ILoggerFactory from "../interfaces/logger-factory";
import IUser from "../../domain/user";
import IReq from "../interfaces/req";
import IRes from "../interfaces/res";
import {Next} from "restify";
import User from "../../domain/impl/user";
import IHTTPServer from "../interfaces/http-server";

const verifyA = promisify(verify as (token: string, secretOrPublicKey: string | Buffer, options?: VerifyOptions, callback?: VerifyCallback) => void);

declare var process: any;

const KEY_FILE = path.resolve(process.env.APP_DIR, 'keys');

// TODO: CHANGE KEYS
const PRIVATE_KEY = readFileSync(`${KEY_FILE}/privkey.pem`);
const PUBLIC_KEY = readFileSync(`${KEY_FILE}/pubkey.pem`);

@injectable()
class SessionService implements ISessionService{
    @inject(__.CacheService) cache: ICacheService;
    private logger: ILogger;

    public constructor( @inject(__.LoggerFactory) LoggerFactory: ILoggerFactory) {
        this.logger = LoggerFactory.getLogger(this)
    }

    public async onBootstrap(server: IHTTPServer) {
        server.registerMiddleware(async (req: IReq, res: IRes, next: Next) => {
            if (req.header('Authorization')) {
                const sessionId = req.header('Authorization').slice(7);
                const token = await this.getSession(sessionId);
                const session = await this.cache.get(Reflect.get(token, 'session-id'));
                if (session) {
                    const user = <IUser> JSON.parse(session);
                    req.user = new User(user);
                    req.user.setAuth(true);
                    req.user.sessionId = sessionId;
                } else {
                    res.header('clear-session', 'true');
                }
            }
            next()
        }, 0)
    }

    public async getSession(token: string): Promise<{ ['session-id']: string }> {
        try {
            const session = await verifyA(token, PUBLIC_KEY, { algorithms: ['RS256'] }) as { ['session-id']: string }
            return session;
        } catch(e) {
            this.logger.error(e)
            return Promise.reject(e);
        }
    }

    public async setSession(user: IUser): Promise<string> {
        const sessionId = uuid();
        const token = sign({ ['session-id']: sessionId }, PRIVATE_KEY, { algorithm: 'RS256' });
        await this.cache.set(sessionId, JSON.stringify(user));
        return token
    }

    public async clearSession(sessionId: string): Promise<boolean> {
        return await this.cache.del(sessionId)
    }
}

export default SessionService
