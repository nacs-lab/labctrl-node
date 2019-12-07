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

export default class RequireLogin extends React.Component {
    static contextType = GlobalContext;
    static defaultProps = {
        approved: false,
        admin: false
    };
    render() {
        let user = this.context.user;
        if (!user)
            return <Login/>;
        if (this.props.approved && !user.approved)
            return <RedirectIn href="/profile">
              {(timeout, props) => (<div>
                Account not approved.<br/>
                You can request approval from <Link {...props}><a>profile page</a></Link>.<br/>
                Redirecting in {timeout} seconds.
              </div>)}
            </RedirectIn>;
        if (this.props.admin && !user.admin)
            return <RedirectIn href="/">
              {(timeout, props) => (<div>
                You are not an admin.<br/>
                Redirecting to <Link {...props}><a>home page</a></Link> in {timeout} seconds.
              </div>)}
            </RedirectIn>;
        return <React.Fragment>
          {this.props.children}
        </React.Fragment>;
    }
}
