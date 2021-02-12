/*************************************************************************
 *   Copyright (c) 2019 - 2019 Yichao Yu <yyc1992@gmail.com>             *
 *                                                                       *
 *   This library is free software; you can redistribute it and/or       *
 *   modify it under the terms of the GNU Lesser General Public          *
 *   License as published by the Free Software Foundation; either        *
 *   version 3.0 of the License, or (at your option) any later version.  *
 *                                                                       *
 *   This library is distributed in the hope that it will be useful,     *
 *   but WITHOUT ANY WARRANTY; without even the implied warranty of      *
 *   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU    *
 *   Lesser General Public License for more details.                     *
 *                                                                       *
 *   You should have received a copy of the GNU Lesser General Public    *
 *   License along with this library. If not,                            *
 *   see <http://www.gnu.org/licenses/>.                                 *
 *************************************************************************/

"use strict";

import api from '../lib/api';
import { simple_click } from '../lib/event';
import GlobalContext from './Global';
import { NotifyContext } from './NotifyMenu';

import Link from 'next/link';
import Router from 'next/router';
import React from 'react';

export default class Login extends React.Component {
    static contextType = GlobalContext;
    constructor(props) {
        super(props);
        this.notify = null;
        this.email = React.createRef();
        this.password = React.createRef();
        this.remember = React.createRef();
        this.state = {
            msg: ""
        };
    }
    login = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        let { login: user } = await api({
            login: { params: { email: this.email.current.value,
                               password: this.password.current.value,
                               remember: this.remember.current.checked } } });
        if (user) {
            if (Router.pathname == '/login')
                Router.push('/');
            this.context.set_user(user);
            return;
        }
        let color;
        let msg1;
        let msg2;
        if (user === false) {
            color = 'text-warning';
            msg1 = 'Account un-verified';
            msg2 = 'Account un-verified. ' +
                   'Please use the link sent to your email address to verify your account';
        }
        else {
            color = 'text-danger';
            msg1 = msg2 = 'Email or password incorrect';
        }
        this.notify.add_notify(`fas fa-exclamation-circle ${color}`,
                               msg1, '', 10000);
        this.setState({msg: <span className={color}>{msg2}</span>});
        this.context.set_user(null);
    }
    key_press = (e) => {
        if (e.keyCode != 13)
            return;
        this.login(e);
    }
    lost_password = (e) => {
        if (!simple_click(e))
            return;
        e.preventDefault();
        e.stopPropagation();
        // Forward the email address to lost password page.
        Router.push({
            pathname: '/lost-password',
            query: {
                email: this.email.current.value
            }
        }, '/lost-password');
    }
    register = (e) => {
        if (!simple_click(e))
            return;
        e.preventDefault();
        e.stopPropagation();
        // Forward the email address and password to registration page.
        Router.push({
            pathname: '/register',
            query: {
                email: this.email.current.value,
                password: this.password.current.value
            }
        }, '/register');
    }
    componentDidMount() {
        // Set the initial value from the previous page.
        if (Router.query.email)
            this.email.current.value = Router.query.email;
        if (Router.query.password)
            this.password.current.value = Router.query.password;
    }
    render() {
        return <NotifyContext.Consumer>
          {notify => {
              this.notify = notify;
              return this.render_real();
          }}
        </NotifyContext.Consumer>;
    }
    render_real() {
        return <div style={{width: "100%"}}>
          <legend className="text-center">Login</legend>
          <div className="container">
            <form>
              <div className="form-group row">
                <label htmlFor="login-email" className="col-sm-2 col-form-label">Email</label>
                <div className="col-sm-10">
                  <input type="email" className="form-control"
                    id="login-email" placeholder="Email" onKeyDown={this.key_press}
                    ref={this.email}/>
                </div>
              </div>
              <div className="form-group row">
                <label htmlFor="login-password"
                  className="col-sm-2 col-form-label">Password</label>
                <div className="col-sm-10">
                  <input type="password" className="form-control"
                    id="login-password" placeholder="Password" onKeyDown={this.key_press}
                    ref={this.password}/>
                </div>
              </div>
              <div className="row nacs-form-msg">
                <div className="col-sm-2"></div>
                <div className="col-sm-10"><small><b>{this.state.msg}</b></small></div>
              </div>
              <div className="form-group row">
                <label className="col-sm-2"></label>
                <div className="col-sm-10">
                  <div className="form-check-inline">
                    <input className="form-check-input" type="checkbox" defaultChecked
                      onKeyDown={this.key_press} ref={this.remember}/>
                    <label className="form-check-label">
                      Remember me
                    </label>
                  </div>
                </div>
              </div>
              <div className="form-group row">
                <div className="offset-sm-2 col-sm-8 text-center">
                  <p style={{marginBottom: 0}}>
                    <button type="submit" onClick={this.login}
                      className="btn btn-primary">Sign in</button>
                  </p>
                  <p className="text-sm">
                    <Link href="/lost-password">
                      <a className="btn btn-link" onClick={this.lost_password}>Lost password</a>
                    </Link>
                    {/* A direct `|` somehow makes emacs indent unhappy... */}
                    <span>|</span>
                    <Link href="/register">
                      <a className="btn btn-link" onClick={this.register}>Register</a>
                    </Link>
                  </p>
                </div>
              </div>
            </form>
          </div>
        </div>;
    }
}
