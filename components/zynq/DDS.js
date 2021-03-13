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
import StatusField from './StatusField';

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
        let show_extra = this.state.show_extra;
        let col_break = show_extra ? "md" : "sm";
        let container = show_extra ? "container-lg" : "container-md";

        let subcol1_w = show_extra ? 7 : 9;
        let subcol2_w = show_extra ? 5 : 3;

        let col_w_name = show_extra ? 7 : 7;
        let col_w_freq = show_extra ? 5 : 5;
        let col_w_amp = show_extra ? 5 : 12;
        let col_w_phase = 6;
        let col_w_reset = 1;

        let col_name = show_extra ? 'col-2 col-sm-3' : 'col-2';
        let col_value = show_extra ? 'col-10 col-sm-9' : 'col-10';

        let extra_title;
        if (show_extra) {
            extra_title = <React.Fragment>
              <div className={`col-${col_w_phase} px-1 text-center`}>
                <b>Phase</b>
              </div>
              <div className={`col-${col_w_reset} px-1`}>
              </div>
            </React.Fragment>;
        }
        rows.push(
            <div className={`row d-none d-${col_break}-flex`} key={-2}>
              <div className={`col-${subcol1_w}`}>
                <div className="row">
                  <div className={`col-${col_w_name} px-1 text-center`}>
                    <b>Name</b>
                  </div>
                  <div className={`col-${col_w_freq} px-1 text-center`}>
                    <b>Frequency</b>
                  </div>
                </div>
              </div>
              <div className={`col-${subcol2_w}`}>
                <div className="row">
                  <div className={`col-${col_w_amp} px-1 text-center`}>
                    <b>Amplitude</b>
                  </div>
                  {extra_title}
                </div>
              </div>
            </div>
        );
        rows.push(<hr className={`row my-1 d-none d-${col_break}-flex`} key={-1}/>);
        let first = true;
        for (let i of this.state.dds_ids) {
            if (!first)
                rows.push(<hr className={`row my-1 d-flex d-${col_break}-none`}
                            key={2 * i - 1}/>);
            first = false;
            let extra;
            if (show_extra) {
                extra = <React.Fragment>
                  <div className={`w-100 d-flex d-${col_break}-none`}/>
                  <div className={`${col_name} d-flex d-${col_break}-none`}>
                    <b>Phase</b>
                  </div>
                  <DDSPhaseField
                    className={`${col_value} col-${col_break}-${col_w_phase} px-1`}
                    source_id={this.props.source_id} dds_id={i}
                    immediate={this.state.immediate}
                    ref={this.get_register_func(`phase${i}`)}
                    onChange={this.refresh_changed_state}/>
                  <div className={`w-100 d-flex d-${col_break}-none`}/>
                  <div className={`col-12 col-${col_break}-${col_w_reset} px-1 text-center`}>
                    <span role="button" className="badge badge-warning" dds_id={i}
                      onClick={this._reset_dds}>
                      <i className="fas fa-redo"></i>
                      <b className={`ml-1 d-inline-block d-${col_break}-none`}>
                        Reset
                      </b>
                    </span>
                  </div>
                </React.Fragment>;
            }
            rows.push(
                <div className="row" key={i * 2} title={`DDS ${i}`}>
                  <div className={`col-${col_break}-${subcol1_w}`}>
                    <div className="row">
                      <div className={`${col_name} d-flex d-${col_break}-none`}>
                        <b>Name</b>
                      </div>
                      <DDSNameField
                        className={`${col_value} col-${col_break}-${col_w_name} px-1`}
                        source_id={this.props.source_id} dds_id={i}/>
                      <div className={`w-100 d-flex d-${col_break}-none`}/>
                      <div className={`${col_name} d-flex d-${col_break}-none`}>
                        <b>Freq</b>
                      </div>
                      <DDSFreqField
                        className={`${col_value} col-${col_break}-${col_w_freq} px-1`}
                        source_id={this.props.source_id} dds_id={i}
                        immediate={this.state.immediate}
                        ref={this.get_register_func(`freq${i}`)}
                        onChange={this.refresh_changed_state}/>
                    </div>
                  </div>
                  <div className={`w-100 d-flex d-${col_break}-none`}/>
                  <div className={`col-${col_break}-${subcol2_w}`}>
                    <div className="row">
                      <div className={`${col_name} d-flex d-${col_break}-none`}>
                        <b>Amp</b>
                      </div>
                      <DDSAmpField
                        className={`${col_value} col-${col_break}-${col_w_amp} px-1`}
                        source_id={this.props.source_id} dds_id={i}
                        immediate={this.state.immediate}
                        ref={this.get_register_func(`amp${i}`)}
                        onChange={this.refresh_changed_state}/>
                      {extra}
                    </div>
                  </div>
                </div>
            );
        }
        return <div className={`${container}`} onWheel={this.on_wheel_cb}>
          <div className="row">
            <legend className="text-center">DDS
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
              <span className="mx-1"></span>
              <div className="form-check-inline">
                <input type="checkbox" className="form-check-input"
                  checked={show_extra} onChange={this._show_extra_change}/>
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
