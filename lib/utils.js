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

function is_object(value) {
    return typeof value === 'object' && value !== null;
}
exports.is_object = is_object;

function object_empty(value) {
    return Object.getOwnPropertyNames(value).length == 0;
}
exports.object_empty = object_empty;

// Returns whether any changes was made to `value` or `undefined` if there's none.
// If `record_change` is `true` the returned value (when not `undefined`)
// records the changes made to `value`.
function update_object(value, new_value, record_change, keep_null = false) {
    let changed = false;
    let change = record_change ? Object.create(null) : true;
    for (let name of Object.getOwnPropertyNames(new_value)) {
        let new_subvalue = new_value[name];
        let subvalue = value[name];
        if (!is_object(new_subvalue)) {
            if (new_subvalue === null && !keep_null) {
                if (subvalue !== undefined) {
                    if (record_change)
                        change[name] = null;
                    changed = true;
                    delete value[name];
                }
            }
            else if (subvalue !== new_subvalue) {
                if (record_change)
                    change[name] = new_subvalue;
                changed = true;
                value[name] = new_subvalue;
            }
            continue;
        }
        let temp_value = false;
        if (!is_object(subvalue)) {
            // Do not put `subvalue` into `value` just yet since the new value
            // could be all deletion in which case nothing would change...
            temp_value = true;
            subvalue = Object.create(null);
        }
        let sub_change = update_object(subvalue, new_subvalue, record_change, keep_null);
        if (sub_change) {
            if (object_empty(subvalue)) {
                delete value[name];
            }
            else if (temp_value) {
                // Now we know that `subvalue` has something useful and we should record it.
                value[name] = subvalue;
            }
            if (record_change)
                change[name] = sub_change;
            changed = true;
        }
    }
    return changed ? change : undefined;
}
exports.update_object = update_object;

function queue_update(watch, change, pending) {
    // Returns the new pending object
    if (!watch || change === undefined)
        return pending;
    if (watch === true || watch.all) {
        if (!is_object(change))
            return change;
        if (!is_object(pending))
            pending = Object.create(null);
        update_object(pending, change, false, true);
        return pending;
    }
    let subwatches = watch.subwatch;
    for (let name of Object.getOwnPropertyNames(subwatches)) {
        if (!Object.prototype.hasOwnProperty.call(change, name))
            continue;
        let subwatch = subwatches[name];
        let subpending = pending ? pending[name] : undefined;
        subpending = queue_update(subwatch, change[name], subpending);
        if (subpending !== undefined) {
            if (!is_object(pending))
                pending = Object.create(null);
            pending[name] = subpending;
        }
    }
    return pending;
}
exports.queue_update = queue_update;