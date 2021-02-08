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

import BoolField from '../BoolField';
import NameField from '../NameField';
import { ArrayCache } from '../../lib/utils';

import React from 'react';

export default class TTLField extends React.Component {
    #field
    #path = new ArrayCache
    #ovr_path = new ArrayCache
    #name_path = new ArrayCache
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
        let { source_id, ttl_id, ...props } = this.props;
        let path = this.#path.get([source_id, 'ttl', `val${ttl_id}`])[0];
        let ovr_path = this.#ovr_path.get([source_id, 'ttl', `ovr${ttl_id}`])[0];
        let name_path = this.#name_path.get([source_id, 'ttl', `name${ttl_id}`])[0];
        return <BoolField {...props} path={path} ovr_path={ovr_path} ref={this.#field}>
          <div className="input-group-prepend">
            <span className="input-group-text bg-white pl-1 pr-0"
              style={{ fontSize: "0.75rem" }}>
              <b style={{minWidth: '2ch'}}>{ttl_id}</b>
            </span>
          </div>
          <NameField path={name_path}/>
        </BoolField>;
    }
};
