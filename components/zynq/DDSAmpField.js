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

import NumberField from '../NumberField';
import { ArrayCache } from '../../lib/utils';

import React from 'react';

export default class DDSAmpField extends React.Component {
    #field
    #path = new ArrayCache
    #ovr_path = new ArrayCache
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
    _get_inc_menu = (cur_value, cur_scale, unit) => {
        cur_value = Number(cur_value);
        return [{ text: '-0.1', value: cur_value - 0.1 },
                { text: '-0.01', value: cur_value - 0.01 },
                { text: '-0.001', value: cur_value - 0.001 },
                { text: '+0.001', value: cur_value + 0.001 },
                { text: '+0.01', value: cur_value + 0.01 },
                { text: '+0.1', value: cur_value + 0.1 }];
    }
    render() {
        let { source_id, dds_id, ...props } = this.props;
        let path = this.#path.get([source_id, 'dds', `amp${dds_id}`])[0];
        let ovr_path = this.#ovr_path.get([source_id, 'dds', `ovr_amp${dds_id}`])[0];
        return <NumberField {...props} path={path} ovr_path={ovr_path}
                 minScale={0} maxScale={0} minValue={0} maxValue={4095}
                 step={1} scale={1 / 4095} minScroll={1} ref={this.#field}
                 get_inc_menu={this._get_inc_menu}/>;
    }
};
