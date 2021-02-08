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

import SingleField from '../SingleField';

import { ScrollWatcher } from '../../lib/event';
import { ArrayCache } from '../../lib/utils';

import React from 'react';

const min_div = 0;
const max_div = 254;
const off_div = 255;
const cycle = 20;

function real_disp2raw(ns, on) {
    if (!on)
        return off_div;
    let v = Math.round(Number(ns) / cycle - 1) | 0;
    if (v < min_div)
        return min_div;
    if (v > max_div)
        return max_div;
    return v;
}

function real_raw2disp(v) {
    if (v === undefined || v >= off_div)
        return ['0', false];
    if (v <= min_div)
        v = min_div;
    v = ((v + 1) * cycle) | 0;
    return [String(v), true];
}

class ClockFieldBase extends SingleField {
    defaultdisp() {
        return off_div;
    }
    defaultraw() {
        return off_div;
    }
    set_value_input = (input) => {
        if (input) {
            // This is necessary to prevent the parent from getting the event
            // and start scrolling. The `SyntheticEvent` from React
            // when using the `onWheel` handler directly doesn't work.
            input.addEventListener("wheel", this.value_scrolled);
        }
    }
    increment_value(delta) {
        let value = this.state.display_value;
        if (value >= off_div)
            return;
        if (delta > 0 && delta < 1) {
            delta = 1;
        }
        else if (delta < 0 && delta > -1) {
            delta = -1;
        }
        let new_value = Math.round(value + delta) | 0;
        if (new_value >= off_div) {
            new_value = max_div;
        }
        else if (new_value <= 0) {
            new_value = 0;
        }
        if (new_value != value) {
            this.set_display_value(new_value);
        }
    }

    value_input_changed = (e) => {
        let value = this.state.display_value;
        // Off, input not editable.
        if (value >= off_div)
            return;
        this.set_display_value(real_disp2raw(e.target.value, true));
    }
    value_on_changed = (e) => {
        let target = e.target;
        let on = target.type === 'checkbox' ? target.checked : target.value;
        let value = this.state.display_value;
        if (on) {
            if (value < off_div)
                return;
            this.set_display_value(0);
        }
        else {
            if (value >= off_div)
                return;
            this.set_display_value(255);
        }
    }
    value_scrolled = (e) => {
        // Only response to vertical scroll when we have focus.
        if (!$(e.target).is(":focus") || e.deltaY == 0)
            return;
        // Also avoid triggering immediately if we have just been scrolling elsewhere.
        // This should prevent catching the page when the user scroll through
        // and start changing the value.
        if (e.timeStamp < ScrollWatcher.last_time() + 300)
            return;
        e.preventDefault();
        e.stopPropagation();
        this.increment_value(-e.deltaY);
    }
    componentDidMount() {
        super.componentDidMount();
        ScrollWatcher.enable();
    }
    key_press(e) {
        if (e.keyCode == 40) {
            // Down
            e.preventDefault();
            e.stopPropagation();
            this.increment_value(-1);
            return;
        }
        else if (e.keyCode == 38) {
            // Up
            e.preventDefault();
            e.stopPropagation();
            this.increment_value(1);
            return;
        }
        super.key_press(e);
    }

    // TODO increment buttons
    input_focus = (e) => {
        this.set_value_focus(true);
    }
    input_blur = (e) => {
        this.set_value_focus(false);
    }

    render() {
        let { className = '' } = this.props;
        let [value, on] = real_raw2disp(this.state.display_value);
        return <div className={`input-group input-group-sm mb-1 ${className}`}>
          <div className="input-group-prepend">
            <div className="input-group-text px-1 border-right-0">
              <input type="checkbox" checked={on} onChange={this.value_on_changed}
              title="Turn on"/>
            </div>
            {
                this.state.value_changed || this.state.ovr_changed ?
                <React.Fragment>
                  <div className="input-group-text px-1 border-right-0"
                    onClick={this.submit} style={{cursor: "pointer"}} title="Submit">
                    <span className='fas fa-check text-success'/>
                  </div>
                  <div className="input-group-text px-1 border-left-0"
                    onClick={this.cancel} style={{cursor: "pointer"}} title="Cancel">
                    <span className='fas fa-fw fa-times text-danger'/>
                  </div>
                </React.Fragment> : <React.Fragment/>
            }
          </div>
          <input type="text" className="form-control text-right px-1"
            value={value} ref={this.set_value_input} onChange={this.value_input_changed}
            onKeyDown={this.key_press} onWheel={this.value_scrolled}
            onFocus={this.input_focus} onBlur={this.input_blur} readOnly={!on}/>
          <div className="input-group-append">
            <span className={`input-group-text ${on ? 'bg-white' : ''} px-1`}
              style={{ fontSize: '0.75rem' }}>
              ns
            </span>
          </div>
        </div>;
    }
};

export default class ClockField extends React.Component {
    #field
    #path = new ArrayCache
    constructor(props) {
        super(props);
        this.#field = React.createRef();
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
        let { source_id, ...props } = this.props;
        let path = this.#path.get([source_id, 'clock'])[0];
        return <ClockFieldBase {...props} path={path} ref={this.#field}/>;
    }
}
