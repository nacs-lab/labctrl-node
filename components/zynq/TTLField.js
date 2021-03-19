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

import BoolField from '../BoolField';
import NameField from '../NameField';

import socket from '../../lib/socket';
import { ArrayCache, getfield_recursive, setfield_recursive } from '../../lib/utils';

import React from 'react';

export default class TTLField extends React.Component {
    #field
    #ttl_id
    #source_id
    #watch_id
    #watch_param
    #path = new ArrayCache
    #ovr_path = new ArrayCache
    #name_path = new ArrayCache
    constructor(props) {
        super(props);
        this._set_paths();
        let values = socket.get_cached(this.#watch_param);
        let ovr_path = this.#ovr_path.get([this.#source_id, 'ttl', `ovr${this.#ttl_id}`])[0];
        let path = this.#path.get([this.#source_id, 'ttl', `val${this.#ttl_id}`])[0];
        this.state = { ovr: !!getfield_recursive(values, ovr_path),
                       value: !!getfield_recursive(values, path) };
        this.#field = React.createRef();
    }
    _set_paths() {
        if (this.#source_id == this.props.source_id && this.#ttl_id == this.props.ttl_id)
            return false;
        this.#source_id = this.props.source_id;
        this.#ttl_id = this.props.ttl_id;
        let ovr_path = this.#ovr_path.get([this.#source_id, 'ttl', `ovr${this.#ttl_id}`])[0];
        let path = this.#path.get([this.#source_id, 'ttl', `val${this.#ttl_id}`])[0];
        this.#watch_param = Object.create(null);
        setfield_recursive(this.#watch_param, ovr_path, 0);
        setfield_recursive(this.#watch_param, path, 0);
        return true;
    }
    _update = () => {
        let params = socket.get_cached(this.#watch_param);
        let ovr_path = this.#ovr_path.get([this.#source_id, 'ttl', `ovr${this.#ttl_id}`])[0];
        let path = this.#path.get([this.#source_id, 'ttl', `val${this.#ttl_id}`])[0];
        this.setState({ ovr: !!getfield_recursive(params, ovr_path),
                        value: !!getfield_recursive(params, path) });
    }
    _refresh = () => {
        if (!socket.connected) {
            this.#watch_id = undefined;
            return;
        }
        if (this.#watch_id !== undefined && !this._set_paths())
            return;
        if (this.#watch_id !== undefined)
            socket.unwatch(this.#watch_id);
        this.#watch_id = socket.watch(this.#watch_param, this._update);
        this._update();
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

    changed() {
        if (!this.#field.current)
            return false;
        return this.#field.current.changed();
    }
    submit() {
        if (!this.#field.current)
            return;
        return this.#field.current.submit();
    }
    cancel() {
        if (!this.#field.current)
            return;
        return this.#field.current.cancel();
    }
    render() {
        let { source_id, ttl_id, ...props } = this.props;
        let path = this.#path.get([source_id, 'ttl', `val${ttl_id}`])[0];
        let ovr_path = this.#ovr_path.get([source_id, 'ttl', `ovr${ttl_id}`])[0];
        let name_path = this.#name_path.get([source_id, 'ttl', `name${ttl_id}`])[0];
        let backgroundColor = "bg-white";
        if (this.state.ovr)
            backgroundColor = this.state.value ? "bg-green" : "bg-red";
        return <BoolField {...props} path={path} ovr_path={ovr_path} ref={this.#field}>
          <div className="input-group-prepend">
            <span className={`input-group-text ${backgroundColor} pl-1 pr-0`}
              style={{ fontSize: "0.75rem" }}>
              <b style={{minWidth: '2ch'}}>{ttl_id}</b>
            </span>
          </div>
          <NameField path={name_path} backgroundColor={backgroundColor}/>
        </BoolField>;
    }
};
