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

import StatusField from './StatusField';
import TTLField from './TTLField';

import React from 'react';

export default class TTLWidget extends DataWidget {
    render() {
        let col_break = 'md';
        let col_break2 = 'sm';
        let rows = [];
        for (let i = 0; i < 8; i++) {
            if (i != 0)
                rows.push(<hr className={`row mt-0 mb-2 d-flex d-${col_break}-none`}
                            key={i * 2 - 1}/>);
            rows.push(
                <div className="row" key={i * 2}>
                  <div className={`col-${col_break}`}>
                    <div className="row">
                      <TTLField className={`col-${col_break2} px-0 pr-${col_break2}-1`}
                        source_id={this.props.source_id} ttl_id={i * 4}
                        immediate={this.state.immediate}
                        ref={this.get_register_func(i * 4)}
                        onChange={this.refresh_changed_state}/>
                      <TTLField className={`col-${col_break2} px-0 pr-${col_break}-1`}
                        source_id={this.props.source_id} ttl_id={i * 4 + 1}
                        immediate={this.state.immediate}
                        ref={this.get_register_func(i * 4 + 1)}
                        onChange={this.refresh_changed_state}/>
                    </div>
                  </div>
                  <div className={`col-${col_break}`}>
                    <div className="row">
                      <TTLField className={`col-${col_break2} px-0 pr-${col_break2}-1`}
                        source_id={this.props.source_id} ttl_id={i * 4 + 2}
                        immediate={this.state.immediate}
                        ref={this.get_register_func(i * 4 + 2)}
                        onChange={this.refresh_changed_state}/>
                      <TTLField className={`col-${col_break2} px-0`}
                        source_id={this.props.source_id} ttl_id={i * 4 + 3}
                        immediate={this.state.immediate}
                        ref={this.get_register_func(i * 4 + 3)}
                        onChange={this.refresh_changed_state}/>
                    </div>
                  </div>
                </div>
            );
        }
        return <div className="container-lg" onWheel={this.on_wheel_cb}>
          <div className="row">
            <legend className="text-center">TTL
              <span className="float-right">
                <StatusField source_id={this.props.source_id}/>
              </span>
            </legend>
          </div>
          {rows}
          <div className="row">
            <div className="col text-center">
              <div className="form-check-inline">
                <input type="checkbox" className="form-check-input"
                  checked={this.state.immediate} onChange={this.immediate_change}/>
                <label className="form-check-label">Apply Immediately</label>
              </div>
            </div>
          </div>
          {
              this.state.changed ?
              <div className="row">
                <div className="col text-center">
                  <button className="btn btn-sm btn-success"
                    onClick={this.submit}>Submit</button>
                  <span className="mx-1"></span>
                  <button className="btn btn-sm btn-danger"
                    onClick={this.cancel}>Cancel</button>
                </div>
              </div> : undefined
          }
        </div>;
    }
}
