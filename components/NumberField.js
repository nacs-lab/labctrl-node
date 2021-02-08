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

import SingleField from './SingleField';

import { ScrollWatcher } from '../lib/event';

import React from 'react';

const pos_prefix = ['k', 'M', 'G', 'T', 'P', 'E', 'Z', 'Y']
const neg_prefix = ['m', 'μ', 'n', 'p', 'f', 'a', 'z', 'y']
const pos_max = 8;
const neg_max = -8;

function get_prefix(n) {
    if (n > 0)
        return pos_prefix[n - 1];
    else if (n < 0)
        return neg_prefix[-n - 1];
    return '';
}
function get_full_unit(n, unit) {
    let full_unit = get_prefix(n) + unit;
    if (!full_unit)
        full_unit = 'x1';
    return full_unit;
}

function value_from_state(state) {
    return state.display_value ? state.display_value[0] : 0;
}
function scale_from_state(state) {
    return state.display_value ? state.display_value[1] : 0;
}

function next_float(v) {
    if (v == 0)
        return Number.MIN_VALUE;
    let eps = Math.abs(v * Number.EPSILON);
    if (eps < Number.MIN_VALUE)
        eps = Number.MIN_VALUE;
    let v2 = v + eps / 2;
    if (v2 != v)
        return v2;
    v2 = v + eps;
    if (v2 != v)
        return v2;
    return v + eps * 2;
}
function prev_float(v) {
    if (v == 0)
        return -Number.MIN_VALUE;
    let eps = Math.abs(v * Number.EPSILON);
    if (eps < Number.MIN_VALUE)
        eps = Number.MIN_VALUE;
    let v2 = v - eps / 2;
    if (v2 != v)
        return v2;
    v2 = v - eps;
    if (v2 != v)
        return v2;
    return v - eps * 2;
}
function find_bound(v, step, scale) {
    let n = Math.round(v / step);
    let lo = (n - 0.5) * step / scale;
    // Put a iteration limit in case we messed something up = = ...
    for (let i = 0; i < 10; i++) {
        if (Math.round(lo * scale / step) == n)
            break;
        lo = next_float(lo);
    }
    if (!Number.isFinite(lo))
        lo = -Number.MAX_VALUE;
    let hi = (n + 0.5) * step / scale;
    // Put a iteration limit in case we messed something up = = ...
    for (let i = 0; i < 10; i++) {
        if (Math.round(hi * scale / step) == n)
            break;
        hi = prev_float(hi);
    }
    if (!Number.isFinite(hi))
        hi = Number.MAX_VALUE;
    // now `[lo * scale, hi * scale]` is the range that "equal"s to `v`
    return [lo, hi];
}
function find_min_digit(lo, hi) {
    if (lo <= 0 && hi >= 0)
        return [0, undefined];
    if (lo >= hi)
        return [(lo + hi) / 2, undefined];
    let digit = Math.floor(Math.log10(hi - lo));
    let step = 10**digit;
    let round = Math.ceil(lo / step) * step;
    // We should have at least one multiple of 10^digit within `[lo, hi]` now.
    while (true) {
        let next_digit = digit + 1;
        step = 10**next_digit;
        let next_round_lo = Math.ceil(lo / step) * step
        let next_round_hi = Math.floor(hi / step) * step
        if (!(next_round_hi >= next_round_lo) || !Number.isFinite(next_round_lo))
            return [round, digit];
        digit = next_digit;
        round = next_round_lo;
    }
}

export default class NumberField extends SingleField {
    _normalize_value(val) {
        let { minValue = -Infinity, maxValue = Infinity, step = 0 } = this.props;
        if (step > 0)
            val = step * Math.round(val / step);
        if (val < minValue) {
            val = minValue;
        }
        else if (val > maxValue) {
            val = maxValue;
        }
        return val;
    }

    disp2raw(v) {
        let { scale: vscale = 1 } = this.props;
        return this._normalize_value(Number(v[0]) * 10**(v[1] * 3) / vscale);
    }
    raw2disp_scale(v, lscale, scale) {
        if (scale === undefined)
            scale = 10**(lscale * 3);
        let { step = 0, scale: vscale = 1 } = this.props;
        if (!(step > 0))
            return [String(v / scale), lscale];
        let [lo, hi] = find_bound(v, step * vscale, scale);
        let digit;
        [v, digit] = find_min_digit(lo, hi);
        if (digit === undefined)
            return [String(v), lscale];
        let vs = digit < 0 ? v.toFixed(-digit) : v.toFixed();
        return [vs, lscale];
    }
    raw2disp(v) {
        let { scale: vscale = 1 } = this.props;
        v = this._normalize_value(v) * vscale;
        let { minScale = -24, maxScale = 24 } = this.props;
        let lscale = scale_from_state(this.state);
        let scale = 10**(lscale * 3);
        let vabs = Math.abs(v);
        if (vabs < 0.1 * scale) {
            lscale = Math.floor(Math.log10(vabs / 0.1) / 3);
            if (lscale * 3 < minScale)
                lscale = Math.ceil((minScale - 0.5) / 3);
            scale = 10**(lscale * 3);
        }
        else if (vabs > 2 * scale) {
            lscale = Math.floor(Math.log10(vabs / 2) / 3);
            if (lscale * 3 > maxScale)
                lscale = Math.floor((maxScale + 0.5) / 3);
            scale = 10**(lscale * 3);
        }
        return this.raw2disp_scale(v, lscale, scale);
    }
    defaultdisp() {
        return ['', 0];
    }
    defaultraw() {
        return 0;
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
        let { step = 0, minScroll = 0, minValue = -Infinity, maxValue = Infinity } = this.props;
        if (!minScroll) {
            if (step > 0) {
                minScroll = step;
            }
            else if (Number.isFinite(maxValue - minValue) && maxValue > minValue) {
                minScroll = (maxValue - minValue) * 3e-4;
            }
            else {
                minScroll = 1e-4;
            }
        }
        let disp_value = [value_from_state(this.state), scale_from_state(this.state)];
        let value = this.disp2raw(disp_value);
        let scroll = Math.abs(value) * 0.01 * delta;
        if (delta > 0 && scroll < minScroll) {
            scroll = minScroll;
        }
        else if (delta < 0 && scroll > -minScroll) {
            scroll = -minScroll;
        }
        let new_value = this._normalize_value(value + scroll);
        if (new_value != value) {
            this.set_display_value(this.raw2disp(new_value));
        }
    }

    // TODO multiple units
    unit_selected = (e) => {
        // This stops the page from scrolling all the way to the top when selecting the unit.
        e.preventDefault();
        // Change the display without changing the value
        // (as much as possible, to within rounding error)
        let { scale: vscale = 1 } = this.props;
        let disp_value = [value_from_state(this.state), scale_from_state(this.state)];
        let value = this.disp2raw(disp_value);
        this.set_display_value(this.raw2disp_scale(value * vscale,
                                                   Number(e.target.getAttribute('scalevalue'))));
    }
    value_input_changed = (e) => {
        this.set_display_value([e.target.value, scale_from_state(this.state)]);
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
        let { className = '', unit = '', minScale = -24, maxScale = 24 } = this.props;
        let cur_value = value_from_state(this.state);
        let cur_scale = scale_from_state(this.state);
        let full_unit = get_full_unit(cur_scale, unit);
        let dropdown = [];
        for (let i = pos_max; i >= neg_max; i--) {
            if (i * 3 < minScale || i * 3 > maxScale)
                continue;
            dropdown.push(<a className={"dropdown-item" + (i == cur_scale ? " disabled" : "") }
                            onClick={i == cur_scale ? undefined : this.unit_selected}
                            scalevalue={i} key={i} href="#">{get_full_unit(i, unit)}</a>);
        }
        let unit_dropdown;
        if (dropdown.length > 1) {
            unit_dropdown = <div className="input-group-append" style={{cursor: "pointer"}}>
              <span className="input-group-text bg-white px-1" style={{ fontSize: '0.75rem',
                                                                        minWidth: '2.5ch'}}
                data-toggle="dropdown">
                {full_unit}
              </span>
              <div className="dropdown-menu dropdown-menu-right" style={{ minWidth: '1rem' }}>
                {dropdown}
              </div>
            </div>;
        }
        else if (full_unit == 'x1') {
            unit_dropdown = <React.Fragment/>;
        }
        else {
            unit_dropdown = <div className="input-group-append">
              <span className="input-group-text bg-white px-1" style={{ fontSize: '0.75rem' }}>
                {full_unit}
              </span>
            </div>;
        }
        return <div className={`input-group input-group-sm mb-1 ${className}`}>
          <div className="input-group-prepend">
            {
                this.has_ovr() ?
                <div className={"input-group-text px-1" + (this.state.display_ovr ?
                                                           " bg-info" : "")}
                  onClick={this.ovr_toggle} style={{cursor: "pointer"}}
                  title={this.state.display_ovr ? "Disable override" : "Enable override"}>
                  <span
                    className={'fas fa-fw ' + (this.state.display_ovr ?
                                               'fa-lock' : 'fa-thumbtack')}/>
                </div> : <React.Fragment/>
            }
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
            value={cur_value} ref={this.set_value_input} onChange={this.value_input_changed}
            onKeyDown={this.key_press} onWheel={this.value_scrolled}
            onFocus={this.input_focus} onBlur={this.input_blur}/>
          {unit_dropdown}
        </div>;
    }
}
