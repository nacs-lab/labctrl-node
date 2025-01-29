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

const { validate_email, validate_password } = require('../lib/account');
import api from '../lib/api';
import { simple_click } from '../lib/event';
import CheckAnonymous from '../components/CheckAnonymous';
import RedirectIn from '../components/RedirectIn';
import Wrapper from '../components/Wrapper';

import Link from 'next/link';
import React from 'react';
import Router from 'next/router';

export default class Register extends React.Component {
    constructor(props) {
        super(props);
        this.email = React.createRef();
        this.password = React.createRef();
        this.repeat_password = React.createRef();
        this.state = {
            email_msg: '',
            password_msg: '',
            repeat_password_msg: '',
            registered: ''
        };
    }
    key_press = (e) => {
        if (e.keyCode != 13)
            return;
        this.register(e);
    }
    register = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        let email = this.email.current.value;
        let password = this.password.current.value;
        let repeat_password = this.repeat_password.current.value;
        let valid = true;
        if (!email) {
            valid = false;
            this.setState({ email_msg: 'Email cannot be empty.' });
        }
        else if (!validate_email(email)) {
            valid = false;
            this.setState({ email_msg: 'Invalid email address.' });
        }
        else {
            this.setState({ email_msg: '' });
        }
        if (!password) {
            valid = false;
            this.setState({ password_msg: 'Password cannot be empty.' });
        }
        else {
            let password_res = validate_password(password);
            if (password_res !== true) {
                valid = false;
                this.setState({ password_msg: password_res });
            }
            else {
                this.setState({ password_msg: '' });
            }
        }
        if (!repeat_password) {
            valid = false;
            this.setState({ repeat_password_msg: 'Please repeat your password.' });
        }
        else if (password != repeat_password) {
            valid = false;
            this.setState({ repeat_password_msg: 'Password does not agree.' });
        }
        else {
            this.setState({ repeat_password_msg: '' });
        }
        if (!valid)
            return;
        let { register: res } = await api({ register: { params: { email, password } } });
        if (typeof(res) !== 'object') {
            this.setState({ email_msg: 'Unknown error.' });
        }
        else if (res.error) {
            this.setState(res.error);
        }
        else if (res.user) {
            this.setState({ registered : res.user });
        }
        else {
            this.setState({ email_msg: 'Unknown error.' });
        }
    }
    cancel = (e) => {
        if (!simple_click(e))
            return;
        e.preventDefault();
        e.stopPropagation();
        // Forward the email address and password to login page.
        Router.push({
            pathname: '/login',
            query: {
                email: this.email.current.value,
                password: this.password.current.value
            }
        }, '/login');
    }
    componentDidMount() {
        // Set the initial value from the previous page.
        if (Router.query.email)
            this.email.current.value = Router.query.email;
        if (Router.query.password)
            this.password.current.value = Router.query.password;
        // Don't set value for `repeat_password`.
        // Require the user to type in the password again.
    }
    render() {
        return <Wrapper>
          <CheckAnonymous>
            {this.render_real()}
          </CheckAnonymous>
        </Wrapper>;
    }
    render_real() {
        if (this.state.registered) {
            return <RedirectIn href={{ pathname: '/login',
                                       query: { email: this.state.registered } }} as="/login">
              {(timeout, props) => (<div>
                You will be able to login after confirming your email address using the
                email we've just sent you.<br/>
                Redirect to <Link { ...props }>login</Link> in {timeout} seconds.
              </div>)}
            </RedirectIn>;
        }
        return <div style={{width: "100%"}}>
          <legend className="text-center">Register with your Email address</legend>
          <div className="container">
            <form>
              <div className="form-group row">
                <label htmlFor="register-email" className="col-sm-3 col-form-label">Email</label>
                <div className="col-sm-9">
                  <input type="email" className="form-control"
                    id="register-email" placeholder="Email" onKeyDown={this.key_press}
                    ref={this.email}/>
                </div>
              </div>
              <div className="row nacs-form-msg">
                <div className="col-sm-3"></div>
                <div className="col-sm-9 text-red">
                  <small><b>{this.state.email_msg}</b></small>
                </div>
              </div>
              <div className="form-group row">
                <label htmlFor="register-password"
                  className="col-sm-3 col-form-label">Choose Password</label>
                <div className="col-sm-9">
                  <input type="password" className="form-control"
                    id="register-password" placeholder="Choose Password"
                    onKeyDown={this.key_press} ref={this.password}/>
                </div>
              </div>
              <div className="row nacs-form-msg">
                <div className="col-sm-3"></div>
                <div className="col-sm-9 text-red">
                  <small><b>{this.state.password_msg}</b></small>
                </div>
              </div>
              <div className="form-group row">
                <label htmlFor="register-repeat-password"
                  className="col-sm-3 col-form-label">Repeat Password</label>
                <div className="col-sm-9">
                  <input type="password" className="form-control"
                    id="register-repeat-password" placeholder="Repeat Password"
                    onKeyDown={this.key_press} ref={this.repeat_password}/>
                </div>
              </div>
              <div className="row nacs-form-msg">
                <div className="col-sm-3"></div>
                <div className="col-sm-9 text-red">
                  <small><b>{this.state.repeat_password_msg}</b></small>
                </div>
              </div>
              <div className="form-group row">
                <div className="offset-sm-2 col-sm-8 text-center">
                  <button type="submit" onClick={this.register}
                    className="btn btn-primary">Register</button>
                  <span style={{margin: "0.5em"}}/>
                  <Link href="/login" onClick={this.cancel}
                    className="btn btn-secondary" role="button">
                    Cancel
                  </Link>
                </div>
              </div>
            </form>
          </div>
        </div>;
    }
}
