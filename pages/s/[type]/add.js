/*************************************************************************
 *   Copyright (c) 2019 - 2021 Yichao Yu <yyc1992@gmail.com>             *
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

import Wrapper from '../../../components/Wrapper';
import CheckLogin from '../../../components/CheckLogin';
import RedirectIn from '../../../components/RedirectIn';
import { Config } from '../../../components/SourceWidgets';

import socket from '../../../lib/socket';

import Link from 'next/link';
import React from 'react';

export default class Page extends React.Component {
    static async getInitialProps(ctx) {
        let { type } = ctx.query;
        return { src_type: type };
    }
    _error() {
        return <RedirectIn href="/">
          {(timeout, props) => (<div>
            Unknown page.<br/>
            Redirecting to <Link {...props}>home page</Link> in {timeout} seconds.
          </div>)}
        </RedirectIn>;
    }
    _render_real() {
        let { src_type } = this.props;
        let conf = Config[src_type];
        if (!conf)
            return this._error();
        let Widget = conf.add;
        if (!Widget)
            return this._error();
        return <Widget/>;
    }
    render() {
        return <Wrapper>
          <CheckLogin approved={true}>
            {this._render_real()}
          </CheckLogin>
        </Wrapper>;
    }
}
