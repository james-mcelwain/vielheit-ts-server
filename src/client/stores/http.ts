import * as http from 'axios';
import {observable} from "mobx";
import IServiceReq from "../../domain/request/service-request";
import {API_BASE} from "../../server/config/constants";

export class HttpService implements IHttpService {
    @observable
    public httpErrors: IHttpError[] = [];

    private httpOpts = {
        validateStatus: (status) => {
            return (status >= 200 && status < 300) || status === 400
        }
    };

    private async doRequest(method, url, payload: IServiceReq = {}) {
        const res = await http[method](`${API_BASE}/${url}`, payload, this.httpOpts);
        if (res.status === 400) {
            this.httpErrors = JSON.parse(res.data.message).errors
        }
        console.log(res)
        return res
    }

    public clearErrors(): void {
        this.httpErrors = []
    }

    public getErrorMessage(): string {
        return this.httpErrors.map(x => `${x.property}: ${x.errorName}`)
    }

    public async get(url: string) {
        return this.doRequest('get', url)
    }

    public async post(url: string, payload: IServiceReq) {
        return this.doRequest('post', url, payload)
    }

    public async put(url: string, payload: IServiceReq) {
        return this.doRequest('put', url, payload)
    }
}

export interface IHttpService {
    httpErrors: IHttpError[]
    clearErrors()
    getErrorMessage(): string
    get(url: string)
    post(url: string, payload: IServiceReq)
    put(url: string, payload: IServiceReq)
}

export interface IHttpError {
    property: string
    errorCode: number
    errorName: string
    value: string
    required: number
}

