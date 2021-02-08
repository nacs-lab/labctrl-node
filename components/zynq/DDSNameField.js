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

import NameField from '../NameField';
import { ArrayCache } from '../../lib/utils';

import React from 'react';

export default class DDSNameField extends React.Component {
    #path = new ArrayCache
    render() {
        let { source_id, dds_id, className, ...props } = this.props;
        let path = this.#path.get([source_id, 'dds', `name${dds_id}`])[0];
        return <div className={`input-group input-group-sm mb-1 ${className}`}>
          <div className="input-group-prepend">
            <span className="input-group-text bg-white">
              <b style={{minWidth: '2ch'}}>{dds_id}</b>
            </span>
          </div>
          <NameField path={path}/>
        </div>;
    }
};
