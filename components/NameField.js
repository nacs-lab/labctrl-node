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

export default class NameField extends SingleField {
    constructor(props) {
        super(props);
        this.state.editing = false;
    }

    submit() {
        super.submit();
        this.setState({ editing: false });
    }

    cancel() {
        super.cancel();
        this.setState({ editing: false });
    }

    edit = () => {
        this.setState({ editing: true });
    }

    render() {
        let { className = '', standalone = false, backgroundColor = 'bg-white' } = this.props;
        let border = standalone ? "border-right-0" : "border-right-0 border-left-0";
        // Editing name should not be very common so we disable editing by default.
        // Because of this, I don't really want to deal with the focus in/out event
        // to decide if we should accept server update.
        // Fortunately, this shouldn't happen often so it shouldn't matter...
        let input = <input className={`form-control ${backgroundColor} ${border} px-1`}
                      value={this.state.display_value} readOnly={!this.state.editing}
                      onChange={this.value_change}
                      onKeyDown={this.state.editing ? this.key_press : undefined}/>;
        let btns = [];
        if (this.state.editing) {
            btns.push(<div className="input-group-append" key="submit-name"
                        onClick={this.submit} role="button" title="Change Name">
              <span className="input-group-text bg-white px-1" style={{ fontSize: "0.75rem" }}>
                <i className="fas fa-check text-success"/>
              </span>
            </div>);
            btns.push(<div className="input-group-append border-left-0" key="cancel-name"
                        onClick={this.cancel} role="button" title="Restore Name">
              <span className="input-group-text bg-white border-left-0 px-1"
                style={{ fontSize: "0.75rem" }}>
                <i className="fas fa-fw fa-times text-danger"/>
              </span>
            </div>);
        }
        else {
            btns.push(<div className="input-group-append" key="edit-name"
                        onClick={this.edit} role="button" title="Edit Name">
              <span className={`input-group-text ${backgroundColor} px-1`}
                style={{ fontSize: "0.75rem" }}>
                <i className="fas fa-edit"/>
              </span>
            </div>);
        }
        let frag = <React.Fragment>
          { input }
          { btns }
        </React.Fragment>;
        if (standalone)
            return <div className={`input-group input-group-sm mb-1 ${className}`}>
              {frag}
            </div>;
        return frag;
    }
}
