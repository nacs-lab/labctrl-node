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

import socket from '../lib/socket';
import { array_equal, getfield_recursive, setfield_recursive } from '../lib/utils';

import React from 'react';

export default class SingleField extends React.Component {
    #path
    #ovr_path
    #watch_id
    // Changes to `this.state` may be queued and it may not reflect
    // the latest state we **want**.
    // Use custom fields to store some of the latest states
    // so that we can accurately calculate `this.changed()`
    // for the **next** update.
    #ovr_changed = false
    #value_changed = false
    #value = ''
    constructor(props) {
        super(props);
        // Manually bind to allow subclass to overwrite.
        // Using the `() => {}` syntax to define the field
        // throws an error when I try to call `super`.
        this.submit = this.submit.bind(this);
        this.cancel = this.cancel.bind(this);
        this.key_press = this.key_press.bind(this);
        this.state = {
            value: this.defaultraw(),
            value_changed: false,
            display_value: this.defaultdisp(),
            value_focused: false,

            ovr: false,
            ovr_changed: false,
            display_ovr: false,
        };

        this._set_paths();
        let values = socket.get_cached(this._get_watch_params());
        let value = getfield_recursive(values, this.#path);
        if (value !== undefined)
            this.#value = value;
        let ovr = this.#ovr_path ? !!getfield_recursive(values, this.#ovr_path) : false;
        this.state.value = this.#value;
        this.state.display_value = this.raw2disp(this.#value);
        this.state.ovr = ovr;
    }

    // Called by parent
    changed() {
        return this.#value_changed || this.#ovr_changed
    }

    // May be overriden by subclass to have a more flexible mapping
    // between the displayed and stored value.
    disp2raw(v) {
        return v;
    }
    raw2disp(v) {
        return v;
    }
    defaultdisp() {
        return '';
    }
    defaultraw() {
        return '';
    }

    has_ovr() {
        return !!this.props.ovr_path;
    }

    _setvalues = (values) => {
        if (!values)
            return;
        let value = getfield_recursive(values, this.#path);
        if (value !== undefined)
            this.#value = value;
        this.setState((state) => {
            let new_state = {};
            if (value !== undefined) {
                new_state.value = value;
                new_state.display_value = (state.value_changed || state.value_focused) ?
                                          state.display_value : this.raw2disp(value);
            }
            if (this.#ovr_path) {
                let ovr = getfield_recursive(values, this.#ovr_path);
                if (ovr !== undefined) {
                    new_state.ovr = ovr;
                    new_state.display_ovr = ovr;
                }
            }
            return new_state;
        });
    }

    _set_paths() {
        if (array_equal(this.#path, this.props.path) &&
            array_equal(this.#ovr_path, this.props.ovr_path))
            return false;
        this.#path = [ ...this.props.path ];
        this.#ovr_path = this.props.ovr_path ? [ ...this.props.ovr_path ] : undefined;
        return true;
    }
    _get_watch_params() {
        let watch = Object.create(null);
        setfield_recursive(watch, this.#path, 0);
        if (this.#ovr_path)
            setfield_recursive(watch, this.#ovr_path, 0);
        return watch;
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

    set_display_value(value) {
        let raw_value = this.disp2raw(value);
        let changed = this.#value != raw_value;
        if (this.props.immediate) {
            this.#value = raw_value;
            if (changed) {
                let params = Object.create(null);
                setfield_recursive(params, this.#path, raw_value);
                socket.set(params);
            }
            this.#value_changed = false;
            if (this.props.onChange)
                this.props.onChange(this.#ovr_changed);
            this.setState({
                display_value: value,
                value: raw_value,
                value_changed: false,
            });
        }
        else {
            if (changed)
                this.#value_changed = true;
            if (this.props.onChange)
                this.props.onChange(this.#value_changed);
            this.setState({
                display_value: value,
                value_changed: this.#value_changed
            });
        }
    }
    set_value_focus(focus) {
        this.setState((state) => {
            let new_state = { value_focused: !!focus };
            if (!focus && !state.value_changed)
                new_state.display_value = this.raw2disp(state.value);
            return new_state;
        });
    }

    value_change = (e) => {
        let target = e.target;
        this.set_display_value(target.type === 'checkbox' ? target.checked : target.value);
    }

    ovr_toggle = () => {
        this.setState((state) => {
            if (this.props.immediate) {
                let new_value = !state.display_ovr;
                // This should always be true but let's be safe.
                if (this.#ovr_path !== undefined) {
                    let params = Object.create(null);
                    setfield_recursive(params, this.#ovr_path, new_value);
                    socket.set(params);
                }
                this.#ovr_changed = false;
                if (this.props.onChange)
                    this.props.onChange(this.#value_changed);
                return {
                    ovr: new_value,
                    display_ovr: new_value,
                    ovr_changed: false
                };
            }
            else {
                this.#ovr_changed = true;
                if (this.props.onChange)
                    this.props.onChange(true);
                return {
                    display_ovr: !state.display_ovr,
                    ovr_changed: true
                };
            }
        });
    }

    key_press(e) {
        if (e.keyCode == 13) {
            // Enter
            e.preventDefault();
            e.stopPropagation();
            this.submit();
            return;
        }
        else if (e.keyCode == 27) {
            // ESC
            e.preventDefault();
            e.stopPropagation();
            this.cancel();
            return;
        }
    }

    submit() {
        if (!this.#ovr_changed && !this.#value_changed)
            return;
        let params = Object.create(null);
        let value = this.disp2raw(this.state.display_value);
        setfield_recursive(params, this.#path, value);
        let ovr = false;
        if (this.#ovr_path !== undefined) {
            ovr = this.state.display_ovr;
            setfield_recursive(params, this.#ovr_path, ovr);
        }
        socket.set(params);
        this.#ovr_changed = false;
        this.#value_changed = false;
        if (this.props.onChange)
            this.props.onChange();
        this.#value = value;
        this.setState({
            display_value: this.raw2disp(value), // Normalize value
            value: value,
            value_changed: false,
            ovr: ovr,
            ovr_changed: false,
        });
    }

    cancel() {
        this.#ovr_changed = false;
        this.#value_changed = false;
        if (this.props.onChange)
            this.props.onChange();
        this.setState({
            display_value: this.raw2disp(this.#value),
            value_changed: false,
            display_ovr: this.state.ovr,
            ovr_changed: false,
        });
    }
}
