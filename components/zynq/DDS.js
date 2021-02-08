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

import DDSNameField from './DDSNameField';
import DDSFreqField from './DDSFreqField';
import DDSAmpField from './DDSAmpField';
import DDSPhaseField from './DDSPhaseField';

import React from 'react';

export default class DDSWidget extends DataWidget {
    #source_id
    #watch_id
    constructor(props) {
        super(props);
        this._set_source_id();
        this.state.dds_ids = this._get_dds_ids();
        this.state.show_extra = false;
    }
    _get_dds_ids() {
        let values = socket.get_cached({[this.#source_id]: { dds: 0 }});
        let dds_values = getfield_recursive(values, [this.#source_id, 'dds']);
        let res = [];
        if (!dds_values)
            return res;
        for (let i = 0; i < 22; i++) {
            let v = dds_values[`freq${i}`];
            if (v !== null && v !== undefined) {
                res.push(i);
            }
        }
        return res;
    }
    _set_source_id() {
        if (this.#source_id == this.props.source_id)
            return false;
        this.#source_id = this.props.source_id;
        return true;
    }

    _setvalues = (values) => {
        if (!values)
            return;
        this.setState({ dds_ids: this._get_dds_ids() });
    }
    _refresh = () => {
        if (!socket.connected) {
            this.#watch_id = undefined;
            return;
        }
        if (this.#watch_id !== undefined && !this._set_source_id())
            return;
        let watch = {[this.#source_id]: { dds: 0 }};
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
    _show_extra_change = (e) => {
        let target = e.target;
        let value = target.type === 'checkbox' ? target.checked : target.value;
        this.setState({ show_extra: value });
    }
    _reset_dds = (e) => {
        let dds_id = e.currentTarget.getAttribute('dds_id');
        if (dds_id === undefined)
            return;
        socket.call(this.props.source_id, 'reset_dds', Number(dds_id));
    }
    render() {
        let rows = [];
        let col_break = this.state.show_extra ? "md" : "sm";
        let extra_title;
        if (this.state.show_extra) {
            extra_title = <React.Fragment>
              <div className={`col-${col_break} text-center`}>
                <b>Phase</b>
              </div>
              <div className={`col-${col_break}-1`}>
              </div>
            </React.Fragment>;
        }
        rows.push(
            <div className="row" key={-1}>
              <div className={`col-${col_break} text-center`}>
                <b>Name</b>
              </div>
              <div className={`col-${col_break} text-center`}>
                <b>Frequency</b>
              </div>
              <div className={`col-${col_break} text-center`}>
                <b>Amplitude</b>
              </div>
              {extra_title}
            </div>
        );
        for (let i of this.state.dds_ids) {
            let extra;
            if (this.state.show_extra) {
                extra = <React.Fragment>
                  <DDSPhaseField className={`col-${col_break}`}
                    source_id={this.props.source_id} dds_id={i}
                    immediate={this.state.immediate}
                    ref={this.get_register_func(`phase${i}`)}
                    onChange={this.refresh_changed_state}/>
                  <div className={`col-${col_break}-1 text-center`}>
                    <button className="btn btn-xs btn-warning" dds_id={i}
                      onClick={this._reset_dds}>
                      <b>Reset</b>
                    </button>
                  </div>
                </React.Fragment>;
            }
            rows.push(
                <div className="row" key={i} title={`DDS ${i}`}>
                  <DDSNameField className={`col-${col_break}`}
                    source_id={this.props.source_id} dds_id={i}/>
                  <DDSFreqField className={`col-${col_break}`}
                    source_id={this.props.source_id} dds_id={i}
                    immediate={this.state.immediate}
                    ref={this.get_register_func(`freq${i}`)}
                    onChange={this.refresh_changed_state}/>
                  <DDSAmpField className={`col-${col_break}`}
                    source_id={this.props.source_id} dds_id={i}
                    immediate={this.state.immediate}
                    ref={this.get_register_func(`amp${i}`)}
                    onChange={this.refresh_changed_state}/>
                  {extra}
                </div>
            );
        }
        return <div className="container" onWheel={this.on_wheel_cb}>
          <div className="row">
            <legend className="text-center">DDS</legend>
          </div>
          {rows}
          <div className="row">
            <div className="col text-center">
              <div className="form-check-inline">
                <input type="checkbox" className="form-check-input"
                  checked={this.state.immediate} onChange={this.immediate_change}/>
                <label className="form-check-label">Apply Immediately</label>
              </div>
              <span className="mx-1"></span>
              <div className="form-check-inline">
                <input type="checkbox" className="form-check-input"
                  checked={this.state.show_extra} onChange={this._show_extra_change}/>
                <label className="form-check-label">Show Extra</label>
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
