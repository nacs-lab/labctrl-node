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

const SocketManager = require('./socket_manager');

class DemoSource extends SocketManager.Source {
    #bool_fields = ['bool1', 'ovr_bool1', 'bool2',
                    'ovr_freq1', 'ovr_amp1', 'ovr_volt1']
    #value_range = { freq1: [0, 2**31, 1], freq2: [0, 2**31, 1],
                     amp1: [0, 1, 2**-16], amp2: [0, 1, 2**-16],
                     volt1: [-10, 10, 20 / 2**16], volt2: [-10, 10, 20 / 2**16] }
    #name_fields = ['name_bool1', 'name_rf1', 'name_volt1',
                    'name_bool2', 'name_rf2', 'name_volt2']

    constructor(name) {
        super(name);
        let init_vals = Object.create(null);
        for (let f of this.#bool_fields)
            init_vals[f] = false;
        for (let f in this.#value_range)
            init_vals[f] = 0;
        for (let f of this.#name_fields)
            init_vals[f] = f.split('_')[1];
        this.update_values(init_vals);
    }

    set_values(raw_params) {
        let params = Object.create(null);
        for (let f of this.#bool_fields) {
            if (f in raw_params) {
                params[f] = !!raw_params[f];
            }
        }
        for (let f in this.#value_range) {
            let rng = this.#value_range[f];
            let v = raw_params[f];
            if (isNaN(v))
                continue;
            if (v < rng[0]) {
                v = rng[0];
            }
            else if (v > rng[1]) {
                v = rng[1];
            }
            v = rng[2] * Math.round(v / rng[2]);
            params[f] = v;
        }
        for (let f of this.#name_fields) {
            if (f in raw_params) {
                params[f] = raw_params[f];
            }
        }
        console.log(params);
        this.update_values(params);
        return true;
    }

    call_method(name, params) {
        return;
    }
};

module.exports = DemoSource;
