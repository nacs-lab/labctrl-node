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
import { Config } from '../components/SourceWidgets';

import Link from 'next/link';
import React from 'react';

export default class Add extends React.Component {
    _render_real() {
        let add_btns = [];
        for (let type in Config) {
            add_btns.push(
                <Link href={`/s/${type}/add`} key={type}>
                  <a className="list-group-item list-group-item-action">
                    {Config[type].name}
                  </a>
                </Link>);
        }

        return <div className="container">
          <div className="row">
            <legend className="text-center">Add Device</legend>
          </div>
          <div className="list-group">
            {add_btns}
          </div>
        </div>;
    }

    render() {
        return <Wrapper>
          <CheckLogin approved={true}>
            {this._render_real()}
          </CheckLogin>
        </Wrapper>;
    }
}
