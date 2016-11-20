import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {Router, browserHistory} from 'react-router';
import routes from './routes';
import {Provider} from "mobx-react";
import {UserStore} from "./stores/user";
import {HttpService} from "./stores/http";
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';


/*
 We create httpService as a singleton that was can use it as an
 interceptor for 400 errors.

 Same thing with the userStore, it will store information about
 the auth state of the current user.
*/
const httpService = new HttpService()
const userStore = new UserStore(httpService)

const app =
    <Provider userStore={userStore} httpService={httpService}>
        <MuiThemeProvider>
            <Router history={browserHistory}>{routes}</Router>
        </MuiThemeProvider>
    </Provider>;

ReactDOM.render(app, document.getElementById('app'));
