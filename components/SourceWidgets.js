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

import dynamic from 'next/dynamic';

const Pages = {
    zynq: {
        dds: {
            name: "DDS",
            icon: "fas fa-broadcast-tower fa-fw",
            data: { dds: 0, running: 0, connected: 0 },
            widget: dynamic(() => import('./zynq/DDS'))
        },
        ttl: {
            name: "TTL",
            icon: "fas fa-toggle-off fa-fw",
            data: { ttl: 0, running: 0, connected: 0 },
            widget: dynamic(() => import('./zynq/TTL'))
        },
        clock: {
            name: "Clock",
            icon: "far fa-clock fa-fw",
            data: { clock: 0, running: 0, connected: 0 },
            widget: dynamic(() => import('./zynq/Clock'))
        },
        seq: {
            name: "Sequence",
            icon: "fas fa-terminal fa-fw",
            data: { running: 0, connected: 0 },
            widget: dynamic(() => import('./zynq/Seq'))
        }
    }
};

const Config = {
    zynq: { name: 'Zynq Device',
            edit: dynamic(() => import('./zynq/Config')),
            add: dynamic(() => import('./zynq/Add')) }
};

const Widgets = {
    zynq: {
        status: {
            name: "Status",
            data: () => { return { running: 0, connected: 0 }; },
            widget: dynamic(() => import('./zynq/StatusField'))
        },
        dds_name: {
            name: "DDS Name",
            data: (id) => { return { dds: { [`name$id`]: 0 }}; },
            widget: dynamic(() => import('./zynq/DDSNameField'))
        },
        dds_freq: {
            name: "DDS Frequency",
            data: (id) => { return { dds: { [`freq$id`]: 0, [`ovr_freq$id`]: 0 }}; },
            widget: dynamic(() => import('./zynq/DDSFreqField'))
        },
        dds_amp: {
            name: "DDS Amplitude",
            data: (id) => { return { dds: { [`amp$id`]: 0, [`ovr_amp$id`]: 0 }}; },
            widget: dynamic(() => import('./zynq/DDSAmpField'))
        },
        dds_phase: {
            name: "DDS Phase",
            data: (id) => { return { dds: { [`phase$id`]: 0, [`ovr_phase$id`]: 0 }}; },
            widget: dynamic(() => import('./zynq/DDSPhaseField'))
        },
        ttl: {
            name: "TTL",
            data: (id) => { return { ttl: { [`val$id`]: 0, [`ovr$id`]: 0, [`name$id`]: 0 }}; },
            widget: dynamic(() => import('./zynq/TTLField'))
        },
        clock: {
            name: "Clock",
            data: (id) => { return { clock: 0 }; },
            widget: dynamic(() => import('./zynq/ClockField'))
        }
    }
};

export { Pages, Widgets, Config };
