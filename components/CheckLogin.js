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

import GlobalContext from './Global';
import Login from './Login';
import RedirectIn from './RedirectIn';

import Link from 'next/link';
import React from 'react';

export default class CheckLogin extends React.Component {
    static contextType = GlobalContext;
    static defaultProps = {
        approved: false,
        admin: false
    };
    render() {
        let { approved, admin, children } = this.props;
        if (approved && this.context.trusted)
            return <React.Fragment>
              {children}
            </React.Fragment>;
        let user = this.context.user;
        if (!user)
            return <Login/>;
        if (approved && !user.approved)
            return <RedirectIn href="/profile">
              {(timeout, props) => (<div>
                Account not approved.<br/>
                You can request approval from <Link {...props}>profile page</Link>.<br/>
                Redirecting in {timeout} seconds.
              </div>)}
            </RedirectIn>;
        if (admin && !user.admin)
            return <RedirectIn href="/">
              {(timeout, props) => (<div>
                You are not an admin.<br/>
                Redirecting to <Link {...props}>home page</Link> in {timeout} seconds.
              </div>)}
            </RedirectIn>;
        return <React.Fragment>
          {children}
        </React.Fragment>;
    }
}
