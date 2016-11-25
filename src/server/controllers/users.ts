import {Next} from "restify";
import {BadRequestError} from "restify-errors";
import {Post, Get, Controller} from "inversify-restify-utils";
import {injectable, inject} from "inversify";
import {IDatabase} from "pg-promise";
import __, {API_BASE} from "../config/constants";
import Validate from "../validate";
import {IExtensions} from "../db/index";
import IController from "../interfaces/controller";
import IUserService from "../interfaces/user-service";
import ILogger from "../interfaces/logger";
import ILoggerFactory from "../interfaces/logger-factory";
import IRes from "../interfaces/res";
import IReq from "../interfaces/req";
import {IAddUserReq, IAuthenticateUserReq, IFindEmailReq} from "../../domain/request/user";
import {IAuthenticateUserRes, IAddUserRes, IFindEmailRes} from "../../domain/response/user";

@injectable()
@Controller(`${API_BASE}/users`)
class UsersController implements IController {
    @inject(__.UserService)
    private userService: IUserService;
    private logger: ILogger;


    constructor(@inject(__.LoggerFactory) LoggerFactory: ILoggerFactory) {
        this.logger = LoggerFactory.getLogger(this)
    }

    @Get('/')
    private async get(req: IReq, res: IRes, next: Next) {
        return await this.userService.getAll();
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
            return next(new BadRequestError('Email already exists'))
        }

        const id = await this.userService.add(req.body);
        return await this.userService.findById(id);
    }

    @Post('/empty')
    private async empty(req: IReq, res: IRes, next: Next) {
        return await this.userService.empty();
    }

    @Validate
    @Post('/authenticate')
    private async authenticate(req: IReq, res: IRes, next: Next): IAuthenticateUserRes {
        const authenticateUserReq = <IAuthenticateUserReq> req.body;
        const user = await this.userService.findByEmail(authenticateUserReq.email);
        if (!user) {
            return next(new BadRequestError('User not found'))
        }

        return await this.userService.authenticate(req.body.password, user);
    }
}

export default UsersController
