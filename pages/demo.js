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

import Wrapper from '../components/Wrapper';
import CheckLogin from '../components/CheckLogin';
import DemoWidget from '../components/DemoWidget';

import socket from '../lib/socket';

import React from 'react';

export default class DemoPage extends React.Component {
    static async getInitialProps(ctx) {
        let initvalues = await socket.get({'demo0': 0}, true, ctx);
        return { initvalues };
    }
    constructor(props) {
        super(props)
        if (props.initvalues) {
            socket.put(...props.initvalues);
        }
    }
    render() {
        return <Wrapper>
          <CheckLogin>
            <DemoWidget/>
          </CheckLogin>
        </Wrapper>;
    }
}
