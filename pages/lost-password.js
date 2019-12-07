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
import CheckAnonymous from '../components/CheckAnonymous';
import RedirectIn from '../components/RedirectIn';
import Wrapper from '../components/Wrapper';

import Link from 'next/link';
import Router from 'next/router';

export default class LostPassword extends React.Component {
    constructor(props) {
        super(props);
        this.email = React.createRef();
        this.state = {
            email_msg: '',
            password_reset: false
        };
    }
    key_press = (e) => {
        if (e.keyCode != 13)
            return;
        this.reset_password(e);
    }
    reset_password = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        let email = this.email.current.value;
        let valid = true;
        if (!email) {
            valid = false;
            this.setState({ email_msg: 'Email cannot be empty.' });
        }
        else {
            this.setState({ email_msg: '' });
        }
        if (!valid)
            return;
        let { reset_password: res } = await api({ reset_password: { params: { email } } });
        if (typeof(res) === 'object') {
            this.setState(res);
        }
        else if (res === true) {
            this.setState({ password_reset: true });
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
                email: this.email.current.value
            }
        }, '/login');
    }
    componentDidMount() {
        // Set the initial value from the previous page.
        if (Router.query.email) {
            this.email.current.value = Router.query.email;
        }
    }
    render() {
        return <Wrapper>
          <CheckAnonymous>
            {this.render_real()}
          </CheckAnonymous>
        </Wrapper>;
    }
    render_real() {
        if (this.state.password_reset) {
            return <RedirectIn href={{ pathname: '/login',
                                       query: { email: this.state.registered } }} as="/login">
              {(timeout, props) => (<div>
                Please use the link in the email you've just recieved to reset your password.<br/>
                Redirect to <Link { ...props }><a>login</a></Link> in {timeout} seconds.
              </div>)}
            </RedirectIn>;
        }
        return <div className="span8 offset2" style={{width: "100%"}}>
          <legend className="text-center">Password Reset</legend>
          <div className="container">
            <form>
              <div className="form-group row">
                <label htmlFor="lost-password-email"
                  className="col-sm-3 col-form-label">Email</label>
                <div className="col-sm-9">
                  <input type="email" className="form-control"
                    id="lost-password-email" placeholder="Email" onKeyDown={this.key_press}
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
                <div className="offset-sm-2 col-sm-8 text-center">
                  <button type="submit" onClick={this.reset_password}
                    className="btn btn-primary">Send password reset link</button>
                  <span style={{margin: "0.5em"}}/>
                  <Link href="/login">
                    <a onClick={this.cancel}
                      className="btn btn-secondary" role="button">Cancel</a>
                  </Link>
                </div>
              </div>
            </form>
          </div>
        </div>;
    }
}
