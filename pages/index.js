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

import socket from '../lib/socket';
import { getfield_recursive } from '../lib/utils';

import Link from 'next/link';
import React from 'react';

const meta_params = { meta: 0 };
const source_path = ['meta', 'sources'];

export default class Main extends React.Component {
    #watch_id
    constructor(props) {
        super(props);
        this.state = this._source_state();
    }

    _source_state() {
        let sources = getfield_recursive(socket.get_cached(meta_params), source_path);
        let ary = [];
        if (sources) {
            for (let id of Object.getOwnPropertyNames(sources)) {
                ary.push({ id, ...sources[id] });
            }
        }
        return { sources: ary };
    }
    _update = () => {
        this.setState(this._source_state());
    }

    _refresh = () => {
        if (!socket.connected) {
            this.#watch_id = undefined;
            return;
        }
        if (this.#watch_id !== undefined)
            return;
        this.#watch_id = socket.watch(meta_params, this._update);
        this._update();
    }
    componentDidMount() {
        socket.on('connect', this._refresh);
        socket.on('disconnect', this._refresh);
        this._refresh();
    }
    componentWillUnmount() {
        if (this.#watch_id !== undefined) {
            socket.unwatch(this.#watch_id);
        }
    }

    _render_real() {
        let { sources } = this.state;
        let src_btns = [];
        for (let { type, id, name } of sources)
            src_btns.push(
                <Link href={`/s/${type}/${id}/`} key={id}>
                  <a className="list-group-item list-group-item-action">
                    {name}
                  </a>
                </Link>);

        return <div className="container">
          <div className="row">
            <legend className="text-center">Devices</legend>
          </div>
          <div className="list-group">
            {src_btns}
          </div>
        </div>;
    }

    render() {
        return <Wrapper>
          <CheckLogin>
            {this._render_real()}
          </CheckLogin>
        </Wrapper>;
    }
}
