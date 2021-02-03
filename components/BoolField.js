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

import React from 'react';

export default class BoolField extends SingleField {
    defaultdisp() {
        return false;
    }
    defaultraw() {
        return false;
    }

    render() {
        let { className = '', children } = this.props;
        return <div className={`input-group input-group-sm mb-1 ${className}`}>
          <div className="input-group-prepend">
            <div className="input-group-text">
              <input type="checkbox" checked={this.state.display_value}
                onChange={this.value_change}/>
            </div>
            {
                this.has_ovr() ?
                <div className={"input-group-text" + (this.state.display_ovr ?
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
                  <div className="input-group-text border-right-0"
                    onClick={this.submit} style={{cursor: "pointer"}} title="Submit">
                    <span className='fas fa-check text-success'/>
                  </div>
                  <div className="input-group-text border-left-0"
                    onClick={this.cancel} style={{cursor: "pointer"}} title="Cancel">
                    <span className='fas fa-times text-danger'/>
                  </div>
                </React.Fragment> : <React.Fragment/>
            }
          </div>
          <React.Fragment>
            {children}
          </React.Fragment>
        </div>;
    }
}
