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

import socket from '../../lib/socket';
import { array_equal, getfield_recursive, setfield_recursive } from '../../lib/utils';

import React from 'react';

export default class StatusField extends React.Component {
    #source_id
    #connected_path
    #running_path

    #watch_id
    constructor(props) {
        super(props);
        this._set_paths();
        this.state = {
            connected: true,
            running: false,
        };
        let values = socket.get_cached(this._get_watch_params());
        let connected = getfield_recursive(values, this.#connected_path);
        if (connected !== undefined) {
            this.state.connected = connected;
        }
        let running = getfield_recursive(values, this.#running_path);
        if (running !== undefined) {
            this.state.running = running;
        }
    }

    _set_paths() {
        if (this.#source_id == this.props.source_id)
            return false;
        this.#source_id = this.props.source_id;
        this.#connected_path = [ this.props.source_id, 'connected' ];
        this.#running_path = [ this.props.source_id, 'running' ];
        return true;
    }
    _get_watch_params() {
        return { [this.#source_id]: { connected: 0, running: 0 }};
    }

    _setvalues = (values) => {
        if (!values)
            return;
        let connected = getfield_recursive(values, this.#connected_path);
        let running = getfield_recursive(values, this.#running_path);
        let state = {};
        if (connected !== undefined)
            state.connected = connected;
        if (running !== undefined)
            state.running = running;
        this.setState(state);
    }

    _refresh = () => {
        if (!socket.connected) {
            this.#watch_id = undefined;
            return;
        }
        if (this.#watch_id !== undefined && !this._set_paths())
            return;
        let watch = this._get_watch_params();
        if (this.#watch_id !== undefined)
            socket.unwatch(this.#watch_id);
        this.#watch_id = socket.watch(watch, this._setvalues);
        this._setvalues(socket.get_cached(watch));
    }
    componentDidMount() {
        socket.on('connect', this._refresh);
        socket.on('disconnect', this._refresh);
        this._refresh();
    }
    componentDidUpdate() {
        this._refresh();
    }
    componentWillUnmount() {
        if (this.#watch_id !== undefined) {
            socket.unwatch(this.#watch_id);
        }
    }
    render() {
        let { className = '' } = this.props;
        return <span className={className}>
          <i className={this.state.connected ? "far fa-fw fa-check-circle text-success" :
                        "fas fa-fw fa-unlink text-danger"}
            title={this.state.connected ? "Device Connected" : "Device Disconnected"}/>
          <i className={this.state.running ? "fas fa-fw fa-sync text-success" :
                        "fas fa-fw fa-minus text-muted"}
            title={this.state.running ? "Sequence Running" : "Idling"}/>
        </span>;
    }
}
