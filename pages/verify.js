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

import { Token } from '../lib/account';
import api from '../lib/api';
import GlobalContext from '../components/Global';
import ChangePassword from '../components/ChangePassword';
import CheckAnonymous from '../components/CheckAnonymous';
import RedirectIn from '../components/RedirectIn';
import Wrapper from '../components/Wrapper';

import Error from 'next/error';
import Link from 'next/link';

export default class Verify extends React.Component {
    static contextType = GlobalContext;
    static async getInitialProps(ctx) {
        let token = ctx.query.token;
        if (!token || token.length < 2 || token[0] != '/')
            return { token: '' };
        token = token.substr(1);
        let res = await api({ check_token: { params: { token } } }, ctx);
        res.token = token;
        return res;
    }
    componentDidMount() {
        let check_token = this.props.check_token;
        if (check_token && check_token.user) {
            if (check_token.type == Token.Invitation ||
                check_token.type == Token.ResetPassword) {
                this.context.set_user(check_token.user);
            }
        }
    }
    render() {
        if (!this.props.token)
            return <Error statusCode={404}/>;
        return <Wrapper>
          {this.render_real()}
        </Wrapper>;
    }
    render_real() {
        if (!this.props.check_token)
            return this.invalid_token();
        let type = this.props.check_token.type;
        let user = this.props.check_token.user;
        if (type == Token.Verification) {
            // The check request have already verified the user and invalidated the token
            // we just need to redirect the user to login page.
            return <CheckAnonymous>
              <RedirectIn href={{ pathname: '/login',
                                  query: { email: user.email } }} as="/login">
                {(timeout, props) => (<div>
                  Account {this.props.check_token.user.email} verified.<br/>
                  Redirect to <Link { ...props }><a>login</a></Link> in {timeout} seconds.
                </div>)}
              </RedirectIn>
            </CheckAnonymous>;
        }
        else if (type == Token.Invitation) {
            return <ChangePassword token={this.props.token}
                     title="Welcome, please set your password below."
                     submit="Set password"/>;
        }
        else if (type == Token.ResetPassword) {
            return <ChangePassword token={this.props.token}
                     title="Password Reset."
                     submit="Reset password"/>;
        }
        return this.invalid_token();
    }
    invalid_token() {
        return <CheckAnonymous>
          <RedirectIn>
            {(timeout, props) => (<div>
              Token invalid.<br/>
              Redirect to <Link { ...props }><a>home page</a></Link> in {timeout} seconds.
            </div>)}
          </RedirectIn>
        </CheckAnonymous>;
    }
}
