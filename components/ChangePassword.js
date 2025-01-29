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

const { validate_password } = require('../lib/account');
import api from '../lib/api';
import GlobalContext from '../components/Global';
import RedirectIn from './RedirectIn';

import Link from 'next/link';
import React from 'react';

export default class ChangePassword extends React.Component {
    static contextType = GlobalContext;
    static defaultProps = {
        title: 'Changing Password',
        submit: 'Update Password'
    };
    constructor(props) {
        super(props);
        this.old_password = React.createRef();
        this.new_password = React.createRef();
        this.repeat_password = React.createRef();
        this.state = {
            old_password_msg: '',
            new_password_msg: '',
            repeat_password_msg: '',
            updated: false
        };
    }
    key_press = (e) => {
        if (e.keyCode != 13)
            return;
        this.update_password(e);
    }
    update_password = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        let old_password = this.old_password.current ? this.old_password.current.value : '';
        let new_password = this.new_password.current.value;
        let repeat_password = this.repeat_password.current.value;
        let valid = true;
        if (!this.props.token && !old_password) {
            valid = false;
            this.setState({ old_password_msg: 'Please enter old password.' });
        }
        else {
            this.setState({ old_password_msg: '' });
        }
        if (!new_password) {
            valid = false;
            this.setState({ new_password_msg: 'New password cannot be empty.' });
        }
        else {
            let password_res = validate_password(new_password);
            if (password_res !== true) {
                valid = false;
                this.setState({ new_password_msg: password_res });
            }
            else {
                this.setState({ new_password_msg: '' });
            }
        }
        if (!repeat_password) {
            valid = false;
            this.setState({ repeat_password_msg: 'Please repeat your password.' });
        }
        else if (new_password != repeat_password) {
            valid = false;
            this.setState({ repeat_password_msg: 'Password does not agree.' });
        }
        else {
            this.setState({ repeat_password_msg: '' });
        }
        if (!valid)
            return;
        let { change_password: res } = await api({
            change_password: { params: { old_password, new_password,
                                         token: this.props.token } } });
        if (typeof(res) !== 'object') {
            this.setState({ new_password_msg: 'Unknown error.' });
        }
        else if (res.error) {
            this.setState(res.error);
        }
        else if (res.success) {
            this.setState({ updated: true });
        }
        else {
            this.setState({ new_password_msg: 'Unknown error.' });
        }
    }
    render() {
        if (this.state.updated) {
            return <RedirectIn href="/profile">
              {(timeout, props) => (<div>
                Password changed esuccessfully.<br/>
                Redirect to <Link { ...props }>profile page</Link> in {timeout} seconds.
              </div>)}
            </RedirectIn>;
        }
        return <div style={{width: "100%"}}>
          <legend className="text-center">{this.props.title}</legend>
          <div className="container">
            <form>
              <div className="form-group d-none">
                <label htmlFor="email"
                  className="col-sm-3 col-form-label">Email</label>
                <div className="col-sm-9">
                  <input type="email" className="form-control" readOnly
                    id="email" value={this.context.user ? this.context.user.email : ''}/>
                </div>
              </div>
              {
                  this.props.token ? '' : <React.Fragment>
                  <div className="form-group row">
                    <label htmlFor="change-password-old-password"
                      className="col-sm-3 col-form-label">Old password</label>
                    <div className="col-sm-9">
                      <input type="password" className="form-control"
                        id="change-password-old-password" placeholder="Old Password"
                        onKeyDown={this.key_press} ref={this.old_password}/>
                    </div>
                  </div>
                  <div className="row nacs-form-msg">
                    <div className="col-sm-3"></div>
                    <div className="col-sm-9 text-red">
                      <small><b>{this.state.old_password_msg}</b></small>
                    </div>
                  </div>
                  </React.Fragment>
              }
              <div className="form-group row">
                <label htmlFor="change-password-new-password"
                  className="col-sm-3 col-form-label">New password</label>
                <div className="col-sm-9">
                  <input type="password" className="form-control"
                    id="change-password-new-password" placeholder="New Password"
                    onKeyDown={this.key_press} ref={this.new_password}/>
                </div>
              </div>
              <div className="row nacs-form-msg">
                <div className="col-sm-3"></div>
                <div className="col-sm-9 text-red">
                  <small><b>{this.state.new_password_msg}</b></small>
                </div>
              </div>
              <div className="form-group row">
                <label htmlFor="change-password-repeat-password"
                  className="col-sm-3 col-form-label">Repeat password</label>
                <div className="col-sm-9">
                  <input type="password" className="form-control"
                    id="change-password-repeat-password" placeholder="Repeat Password"
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
                  <button type="submit" onClick={this.update_password}
                    className="btn btn-primary">{this.props.submit}</button>
                  {
                      // Do not allow cancellation if the user is
                      // updating the password based on a token.
                      this.props.token ? '' : <React.Fragment>
                      <span style={{margin: "0.5em"}}/>
                      <Link href="/profile" className="btn btn-secondary" role="button">
                        Cancel
                      </Link>
                      </React.Fragment>
                  }
                </div>
              </div>
            </form>
          </div>
        </div>;
    }
}
