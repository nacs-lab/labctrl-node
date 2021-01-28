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

// Returns the changes made to `value` or `undefined` if there's none.
function update_object(value, new_value) {
    let changed = false;
    let change = Object.create(null);
    for (let name of Object.getOwnPropertyNames(new_value)) {
        let new_subvalue = new_value[name];
        let subvalue = value[name];
        if (!is_object(new_subvalue)) {
            if (new_subvalue === null) {
                if (subvalue !== undefined) {
                    change[name] = null;
                    changed = true;
                    delete value[name];
                }
            }
            else if (subvalue !== new_subvalue) {
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
        let sub_change = update_object(subvalue, new_subvalue);
        if (sub_change) {
            if (object_empty(subvalue)) {
                delete value[name];
            }
            else if (temp_value) {
                // Now we know that `subvalue` has something useful and we should record it.
                value[name] = subvalue;
            }
            change[name] = sub_change;
            changed = true;
        }
    }
    return changed ? change : undefined;
}
exports.update_object = update_object;
