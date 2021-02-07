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

// Explicitly passing the scroll event over in case we are scrolling
// in a subpage and the event didn't propagate to the top level.
import { ScrollWatcher } from '../lib/event';

import React from 'react';

// Children that are registered with `register_child`
// are expected to have at least three methods:
//
//   1. `changed()`
//   2. `submit()`
//   3. `cancel()`
export default class DataWidget extends React.Component {
    #children = Object.create(null)
    #register = Object.create(null)
    on_wheel_cb = ScrollWatcher.callback
    constructor(props) {
        super(props);
        this.state = {
            changed: false,
            immediate: false
        };
    }
    get_register_func(id) {
        let func = this.#register[id];
        if (func === undefined) {
            func = (child) => this.register_child(id, child);
            this.#register[id] = func;
        }
        return func;
    }
    register_child(id, child) {
        if (child) {
            this.#children[id] = child;
        }
        else {
            delete this.#children[id];
        }
        this.refresh_changed_state();
    }
    refresh_changed_state = (changed=false) => {
        if (!changed) {
            for (let id in this.#children) {
                let child = this.#children[id];
                if (child.changed()) {
                    changed = true;
                    break;
                }
            }
        }
        this.setState({ changed });
    }
    immediate_change = (e) => {
        let target = e.target;
        let value = target.type === 'checkbox' ? target.checked : target.value;
        this.setState({ immediate: value });
    }
    submit = () => {
        for (let id in this.#children) {
            this.#children[id].submit();
        }
    }
    cancel = () => {
        for (let id in this.#children) {
            this.#children[id].cancel();
        }
    }
};
