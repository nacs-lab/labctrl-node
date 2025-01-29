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
import RedirectIn from './RedirectIn';

import Link from 'next/link';
import Router from 'next/router';
import React from 'react';

// For pages that only makes sense for users that are not logged in
// (e.g. register, login) Redirect to `/` if the user is already logged in.
export default class CheckAnonymous extends React.Component {
    static contextType = GlobalContext;
    render() {
        if (!this.context.user)
            return <React.Fragment>
              {this.props.children}
            </React.Fragment>;
        return <RedirectIn href="/" timeout={5}>
          {(timeout, props) => (<div>
            Already logged in as {this.context.user.email}.<br/>
            Redirect to <Link {...props}>home page</Link> in {timeout} seconds.
          </div>)}
        </RedirectIn>;
    }
}
