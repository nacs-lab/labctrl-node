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
import { getfield_recursive, ArrayCache } from '../../lib/utils';

import DataWidget from '../DataWidget';

import ClockField from './ClockField';
import StatusField from './StatusField';

import React from 'react';

export default class ClockWidget extends DataWidget {
    render() {
        return <div className="container" onWheel={this.on_wheel_cb}>
          <div className="row">
            <legend className="text-center">Clock
              <span className="float-right">
                <StatusField source_id={this.props.source_id}/>
              </span>
            </legend>
          </div>
          <div className="row">
            <div className="col-sm-4 text-sm-right"><b>Clock Cycle</b></div>
            <ClockField className="col-sm-8" source_id={this.props.source_id}
              immediate={this.state.immediate} ref={this.get_register_func(0)}
              onChange={this.refresh_changed_state}/>
          </div>
          <div className="row">
            <div className="col text-center">
              <div className="form-check-inline">
                <input type="checkbox" className="form-check-input"
                  checked={this.state.immediate} onChange={this.immediate_change}/>
                <label className="form-check-label">Apply Immediately</label>
              </div>
            </div>
          </div>
        </div>;
    }
}
