import {Next} from "restify";
import {BadRequestError, InternalServerError} from "restify-errors";
import {Post, Get, Controller} from "inversify-restify-utils";
import {injectable, inject} from "inversify";
import __, {API_BASE} from "../config/constants";
import Validate from "../validate";
import IController from "../interfaces/controller";
import IUserService from "../interfaces/user-service";
import ILogger from "../interfaces/logger";
import ILoggerFactory from "../interfaces/logger-factory";
import IRes from "../interfaces/res";
import IReq from "../interfaces/req";
import {IAddUserReq, IAuthenticateUserReq, IFindEmailReq} from "../../domain/request/user";
import {IAuthenticateUserRes, IAddUserRes, IFindEmailRes} from "../../domain/response/user";
import Protected from "../middleware/protected";
import ISessionService from "../interfaces/session-service";

@injectable()
@Controller(`${API_BASE}/users`)
class UsersController implements IController {
    @inject(__.UserService)
    private userService: IUserService;

    @inject(__.SessionService)
    private sessionService: ISessionService;

    private logger: ILogger;


    constructor(@inject(__.LoggerFactory) LoggerFactory: ILoggerFactory) {
        this.logger = LoggerFactory.getLogger(this)
    }

    @Protected
    @Get('/')
    private async get(req: IReq, res: IRes, next: Next) {
        return await this.userService.getAll();
    }

    @Protected
    @Get('/logout')
    private async logout(req: IReq, res: IRes, next: Next) {
        if (!req.user) {
            res.send(500);
            return next(new InternalServerError('Invalid user'));
        }
       
        if (!req.user.sessionId) {
            res.send(500);
            return next(new InternalServerError('Invalid session id'));
        }

        this.sessionService.clearSession(req.user.sessionId);
        res.header('clear-session', 'true');
        return res.redirect('/', next)
    }

    @Post('/session')
    private async getSession(req: IReq, res: IRes, next: Next) {
        if(req.user) return req.user.serialize();
        res.send(200);
        return next()
    }

    @Post('/find-email')
    private async findEmail(req: IReq, res: IRes, next: Next): Promise<IFindEmailRes> {
        const findEmailReq = <IFindEmailReq> req.body;
        const user = await this.userService.findByEmail(findEmailReq.email);
        return { exists: user? true: false }
    }

    @Validate
    @Post('/add')
    private async add(req: IReq, res: IRes, next: Next): Promise<IAddUserRes> {
        const addUserReq = <IAddUserReq> req.body;
        const emailExists = await this.userService.findByEmail(addUserReq.email);
        if (emailExists) {
            const err = new BadRequestError('Email already exists')
            next()
            return Promise.reject(err)
        }

        const id = await this.userService.add(req.body);
        const user = await this.userService.findById(id);
        if (!user) {
            return Promise.reject(new InternalServerError('User not found after add'))
        }

        return user;
    }

    @Post('/empty')
    private async empty(req: IReq, res: IRes, next: Next) {
        return await this.userService.empty();
    }

    @Validate
    @Post('/authenticate')
    private async authenticate(req: IReq, res: IRes, next: Next): Promise<IAuthenticateUserRes> {
        const authenticateUserReq = <IAuthenticateUserReq> req.body;
        const user = await this.userService.findByEmail(authenticateUserReq.email);
        if (!user) {
            const err = next(new BadRequestError('User not found'))
            next(err)
            return Promise.reject(err)
        }

        return await this.userService.authenticate(req.body.password, user);
    }
}

export default UsersController
