/*************************************************************************
 *   Copyright (c) 2021 - 2021 Yichao Yu <yyc1992@gmail.com>             *
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

import Link from 'next/link';
import React from 'react';

import socket from '../../lib/socket';
import { getfield_recursive } from '../../lib/utils';

export default class ZynqConfig extends React.Component {
    #watch_id
    #watch_param
    #source_path
    constructor(props) {
        super(props);
        this.#watch_param = { meta: { sources: { [props.src_id]: 0 }}};
        this.#source_path = ['meta', 'sources', props.src_id];
        this.state = this._get_state();
    }
    _get_state() {
        let params = getfield_recursive(socket.get_cached(this.#watch_param),
                                        this.#source_path);
        let state = { name_changed: false, addr_changed: false };
        if (!params)
            return state;
        if (params.name)
            state.name = params.name;
        if (params.params && params.params.addr)
            state.addr = params.params.addr;
        return state;
    }
    _update = () => {
        let update_state = this._get_state();
        this.setState(state => {
            let new_state = {};
            // Don't update after we've got the initial value
            // or if the user has started typing.
            if (!state.name_changed && !state.name)
                new_state.name = update_state.name;
            if (!state.addr_changed && !state.addr)
                new_state.addr = update_state.addr;
            return new_state;
        });
    }
    _refresh = () => {
        if (!socket.connected) {
            this.#watch_id = undefined;
            return;
        }
        if (this.#watch_id !== undefined)
            return;
        this.#watch_id = socket.watch(this.#watch_param, this._update);
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

    _save_click = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        let { src_id } = this.props;
        let { name, addr } = this.state;
        let res = await socket.call('meta', 'config_source', { id: src_id, name: name,
                                                               params: { addr: addr } });
        console.log(res);
    }

    _name_change = (e) => {
        this.setState({ name: e.target.value });
    }
    _addr_change = (e) => {
        this.setState({ name: e.target.value });
    }

    render() {
        let { name, addr } = this.state;
        let { src_id } = this.props;
        return <div className="container">
          <div className="row">
            <legend className="text-center">Zynq Backend Config</legend>
          </div>
          <form>
            <div className="form-group row">
              <label className="col-sm-3 col-form-label">Name</label>
              <div className="col-sm-9">
                <input className="form-control" value={name} onChange={this._name_change}/>
              </div>
            </div>
            <div className="form-group row">
              <label className="col-sm-3 col-form-label">Address</label>
              <div className="col-sm-9">
                <input className="form-control" value={addr} onChange={this._addr_change}/>
              </div>
            </div>
            <hr className={`row my-3`}/>
            <div className="form-group row">
              <div className="col text-center">
                <button className="btn btn-primary"
                  onClick={this._save_click}>Apply</button>
                <span className="mx-2"></span>
                <Link href={`/s/zynq/${src_id}`}>
                  <a className="btn btn-secondary">Back</a>
                </Link>
              </div>
            </div>
          </form>
        </div>;
    }
}
