/*************************************************************************
 *   Copyright (c) 2019 - 2019 Yichao Yu <yyc1992@gmail.com>             *
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

import React from 'react';

export const NotifyContext = React.createContext();

export class NotifyProvider extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            readId: 0,
            maxId: 0,
            nNew: 0,
            items: [],
            add_notify: this.add_notify,
            menu_shown: this.menu_shown,
            menu_hidden: this.menu_hidden
        };
    }

    // Helper to filter notification items with no mutation to the original one...
    static filter_items(items, cb) {
        // Lazily copy.
        let new_items = undefined;
        function copy(n) {
            new_items = items.slice(0, n);
        }
        for (let i in items) {
            let item = items[i];
            let res = cb(item, i);
            if (res instanceof Object) {
                // This does not handle `Object.create(null)`
                // but is good enough for our purpose
                // Returned a replacement object
                if (new_items === undefined)
                    copy(i);
                new_items.push(res);
            }
            else if (res) {
                if (new_items === undefined)
                    continue;
                new_items.push(item);
            }
            else if (new_items === undefined) {
                // Deleting, just make sure the copy is created.
                copy(i);
            }
        }
        return new_items;
    }

    static cleanup_items(state, new_time) {
        return this.filter_items(state.items, (val, idx) => {
            if (val.id > state.readId) {
                return Object.assign(val, {time: new_time});
            }
            else if (val.time + val.timeout <= new_time) {
                return false;
            }
            return true;
        });
    }

    add_notify = (icon, text, rtext, timeout) => {
        let new_time = Date.now();
        this.setState((state, props) => {
            let items = NotifyProvider.cleanup_items(state, new_time);
            if (items === undefined)
                items = [...state.items];
            let maxId = state.maxId + 1;
            let nNew = state.nNew + 1;
            items.push({icon: icon, text: text, rtext: rtext,
                        id: maxId, time: new_time, timeout: timeout});
            return {maxId: maxId, nNew: nNew, items: items};
        });
    }

    menu_shown = (new_time) => {
        let nNew = 0;
        this.setState((state, props) => {
            nNew = state.nNew;
            let items = NotifyProvider.cleanup_items(state, new_time);
            if (items !== undefined)
                return {items: items};
            return null;
        });
        return nNew;
    }

    menu_hidden = (new_time, old_time) => {
        let nNew = 0;
        this.setState((state, props) => {
            nNew = state.nNew;
            let tdiff = new_time - old_time;
            if (tdiff > 1000 && state.maxId > state.readId) {
                let items = NotifyProvider.cleanup_items(state, new_time);
                let new_states = {
                    readId: state.maxId,
                    nNew: 0
                };
                nNew = 0;
                if (items !== undefined)
                    new_states.items = items;
                return new_states;
            }
            return null;
        });
        return nNew;
    }

    render() {
        return <NotifyContext.Provider value={this.state}>
          {this.props.children}
        </NotifyContext.Provider>;
    }
};

const NotifyIcon = prop => {
    if (prop.nNew > 0) {
        return (<a className="nav-link" data-toggle="dropdown" href="#">
          <i className="far fa-bell"></i>
          <span className="badge badge-warning navbar-badge">{prop.nNew}</span>
        </a>);
    }
    else {
        // Removing the `href="#"` disables the pointer cursor
        return (<a className="nav-link" data-toggle="dropdown">
          <i className="far fa-bell" style={{opacity: .5}}></i>
        </a>);
    }
};

const NotifyHeader = prop => {
    let msg;
    if (prop.n <= 0) {
        msg = prop.isnew ? 'No new notification' : 'No notification';
    }
    else if (prop.n == 1) {
        msg = prop.isnew ? '1 New notification' : '1 Notification';
    }
    else {
        msg = prop.n + (prop.isnew ? ' New notifications' : ' Notifications');
    }
    return <span className="dropdown-header">{msg}</span>
};

const NotifyItem = prop => (
    <a className="dropdown-item" style={{opacity: prop.read ? 0.45 : 1}}>
      <i className={`${prop.notify.icon} mr-2`}></i> {prop.notify.text}
      <span className="float-right text-muted text-sm">{prop.notify.rtext}</span>
    </a>
);

export class NotifyMenu extends React.Component {
    static contextType = NotifyContext;
    constructor(props) {
        super(props);
        this.state = {
            showAll: false,
        };
        this.dropdown = React.createRef();
        this.show_time = -1;
    }

    dropdown_callback = () => {
        // Bootstrap is showing/hiding the menu,
        // We don't want to show/hide items randomly when the user is reading
        // so we do cleanup of notifications when the visibility state changes.
        let old_time = this.show_time;
        let old_show = old_time > 0;
        let new_show = $(this.dropdown.current).hasClass('show');
        if (old_show == new_show)
            return;
        let new_time = Date.now();
        let nNew = 0;
        if (new_show) {
            this.show_time = new_time;
            nNew = this.context.menu_shown(new_time);
        }
        else {
            this.show_time = -1;
            nNew = this.context.menu_hidden(new_time, old_time);
        }
        this.setState((state, props) => {
            if (nNew > 0 && state.showAll)
                return {showAll: false};
            if (nNew <= 0 && !state.showAll)
                return {showAll: true};
            return null;
        });
    }

    ensure_observer() {
        // Runs on the client side.
        let dropdown = this.dropdown.current;
        if (dropdown.observed === undefined) {
            this.observer.disconnect();
            this.observer.observe(dropdown, {
                attributes: true
            });
            $(dropdown).on('hide.bs.dropdown', (e) => {
                // Disable the hide dropdown action if we are clicking the footer for toggling.
                let ce = e.clickEvent;
                if (ce === undefined)
                    return true;
                if ($(ce.target).hasClass('notification-toggle'))
                    return false;
                return true;
            });
            dropdown.observed = true;
        }
    }

    toggle_showall = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.setState((state, props) => {
            return {showAll: !state.showAll};
        });
    }

    componentDidMount() {
        // This runs on the client side.
        this.observer = new MutationObserver(this.dropdown_callback);
        this.ensure_observer();
    }

    componentDidUpdate() {
        // This runs on the client side.
        this.ensure_observer();
    }

    componentWillUnmount() {
        // This runs on the client side.
        if (this.observer !== undefined) {
            this.observer.disconnect();
        }
    }

    render() {
        // Notifications Dropdown Menu
        let items = [];
        let nitems = 0;
        for (let i in this.context.items) {
            // Collect the items to be shown.
            let item = this.context.items[i];
            if (!this.state.showAll && item.id <= this.context.readId)
                continue;
            nitems += 1;
            items.push(<div className="dropdown-divider" key={item.id * 2}></div>);
            items.push(<NotifyItem key={item.id * 2 + 1} notify={item}
                         read={item.id <= this.context.readId}/>);
        }
        let footer;
        // Only show footer if there's a difference between the two states.
        if (this.context.nNew > 0 && this.context.nNew < this.context.items.length) {
            footer = [<div className="dropdown-divider" key="0"></div>,
                      <a className="dropdown-item dropdown-footer notification-toggle"
                        onClick={this.toggle_showall} href="#" key="1">
                        {this.state.showAll ? "See New Notifications" : "See All Notifications"}
                      </a>];
        }
        else {
            footer = [];
        }
        return <li className="nav-item dropdown" ref={this.dropdown}>
          <NotifyIcon nNew={this.context.nNew}/>
          <div className="dropdown-menu dropdown-menu-lg dropdown-menu-right">
            <NotifyHeader n={nitems} isnew={!this.state.showAll}/>
            {items}
            {footer}
          </div>
        </li>;
    }
}
