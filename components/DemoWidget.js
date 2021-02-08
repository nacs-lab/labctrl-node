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

import BoolField from './BoolField';
import NameField from './NameField';
import NumberField from './NumberField';

import DataWidget from './DataWidget';

import React from 'react';

export default class DemoWidget extends DataWidget {
    render() {
        return <div style={{width: "100%"}} onWheel={this.on_wheel_cb}>
          <legend className="text-center">Demo</legend>
          <div className="container">
            <BoolField path={['demo0', 'bool1']} ovr_path={['demo0', 'ovr_bool1']}
              immediate={this.state.immediate} ref={this.get_register_func('bool1')}
              onChange={this.refresh_changed_state}>
              <NameField path={['demo0', 'name_bool1']}/>
            </BoolField>
            <BoolField path={['demo0', 'bool2']} immediate={this.state.immediate}
              ref={this.get_register_func('bool2')} onChange={this.refresh_changed_state}>
              <NameField path={['demo0', 'name_bool2']}/>
            </BoolField>

            <NameField path={['demo0', 'name_rf1']} standalone={true}/>
            <NumberField path={['demo0', 'amp1']} ovr_path={['demo0', 'ovr_amp1']}
              minScale={0} maxScale={0} minValue={0} maxValue={1}
              step={2**-16} minScroll={0.00005} immediate={this.state.immediate}
              ref={this.get_register_func('amp1')} onChange={this.refresh_changed_state}/>
            <NumberField path={['demo0', 'freq1']} ovr_path={['demo0', 'ovr_freq1']}
              minScale={0} maxScale={9} minValue={0} maxValue={2**31} unit="Hz"
              step={1} scale={2e9 / 2**31} minScroll={1} immediate={this.state.immediate}
              ref={this.get_register_func('freq1')} onChange={this.refresh_changed_state}/>
            <NameField path={['demo0', 'name_volt1']} standalone={true}/>
            <NumberField path={['demo0', 'volt1']} ovr_path={['demo0', 'ovr_volt1']}
              minScale={-3} maxScale={0} minValue={-10} maxValue={10} unit="V"
              step={20 / 2**16} minScroll={0.0005} immediate={this.state.immediate}
              ref={this.get_register_func('volt1')} onChange={this.refresh_changed_state}/>

            <NameField path={['demo0', 'name_rf2']} standalone={true}/>
            <NumberField path={['demo0', 'amp2']}
              minScale={0} maxScale={0} minValue={0} maxValue={1}
              step={2**-16} minScroll={0.00005} immediate={this.state.immediate}
              ref={this.get_register_func('amp2')} onChange={this.refresh_changed_state}/>
            <NumberField path={['demo0', 'freq2']}
              minScale={0} maxScale={9} minValue={0} maxValue={2**31} unit="Hz"
              step={1} scale={2e9 / 2**31} minScroll={1} immediate={this.state.immediate}
              ref={this.get_register_func('freq2')} onChange={this.refresh_changed_state}/>
            <NameField path={['demo0', 'name_volt2']} standalone={true}/>
            <NumberField path={['demo0', 'volt2']}
              minScale={-3} maxScale={0} minValue={-10} maxValue={10} unit="V"
              step={20 / 2**16} minScroll={0.0005} immediate={this.state.immediate}
              ref={this.get_register_func('volt2')} onChange={this.refresh_changed_state}/>

            <div className="text-center">
              <div className="form-check-inline">
                <input type="checkbox" className="form-check-input"
                  checked={this.state.immediate} onChange={this.immediate_change}/>
                <label className="form-check-label">Apply Immediately</label>
              </div>
              {
                  this.state.changed ?
                  <div className="offset-sm-2 col-sm-8">
                    <button className="btn btn-sm btn-success"
                      onClick={this.submit}>Submit</button>
                    <span className="mx-1"></span>
                    <button className="btn btn-sm btn-danger"
                      onClick={this.cancel}>Cancel</button>
                  </div> : <React.Fragment/>
              }
            </div>
          </div>
        </div>;
    }
}
