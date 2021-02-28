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

import api from '../lib/api';
import { object_empty } from '../lib/utils';
import CheckLogin from '../components/CheckLogin';
import GlobalContext from '../components/Global';
import { NotifyContext } from '../components/NotifyMenu';
import Wrapper from '../components/Wrapper';

import Link from 'next/link';
import React from 'react';
import Modal from "react-bootstrap/Modal";

export default class Admin extends React.Component {
    static contextType = GlobalContext;
    static async getInitialProps(ctx) {
        return await api({ all_users: 'all_users' }, ctx);
    }
    constructor(props) {
        super(props);
        this.state = {
            all_users: props.all_users,
            invite_emails: '',
            request_only: true,
            remove_email: null
        };
        if (props.all_users) {
            let has_request = false;
            for (let i in props.all_users) {
                let user = props.all_users[i];
                if (user.requested) {
                    has_request = true;
                    break;
                }
            }
            if (!has_request) {
                this.state.request_only = false;
            }
        }
    }
    componentDidUpdate() {
        if (!this.context.user || !this.context.user.admin)
            return;
        // If the user accessed this page before logging in as admin
        // we should reload the user info when the user does become an admin.
        if (this.state.all_users && !object_empty(this.state.all_users))
            return;
        this.refresh();
    }
    async refresh() {
        let { all_users } = await api({ all_users: 'all_users' });
        this.setState({ all_users });
    }
    request_only_change = (e) => {
        this.setState({ request_only: e.target.checked });
    }
    async set_flags(email, flags, i, notify, msg) {
        let res = (await api({ set_flags: { params: { email, flags } } })).set_flags;
        if (!res) {
            notify.add_notify('fas fa-info-circle text-red',
                              msg + ' failed', '', 20);
            return;
        }
        this.setState((state) => {
            if (!state.all_users)
                return null;
            if (state.all_users[i].email != email) {
                let found = false;
                for (let j in state.all_users) {
                    if (state.all_users[j].email != email) {
                        found = true;
                        i = j;
                        break;
                    }
                }
                if (!found) {
                    return null;
                }
            }
            let all_users = [ ...state.all_users ];
            all_users[i] = res;
            return { all_users };
        });
    }
    approve = async (e, email, i, notify) => {
        e.preventDefault();
        e.stopPropagation();
        this.set_flags(email, { approved: true }, i, notify, 'Approve user');
    }
    revoke_approve = async (e, email, i, notify) => {
        e.preventDefault();
        e.stopPropagation();
        this.set_flags(email, { approved: false }, i, notify, 'Revoke user');
    }
    ignore_request = async (e, email, i, notify) => {
        e.preventDefault();
        e.stopPropagation();
        this.set_flags(email, { requested: false }, i, notify, 'Ignore user');
    }
    grant_admin = async (e, email, i, notify) => {
        e.preventDefault();
        e.stopPropagation();
        this.set_flags(email, { admin: true }, i, notify, 'Grant admin ');
    }
    revoke_admin = async (e, email, i, notify) => {
        e.preventDefault();
        e.stopPropagation();
        this.set_flags(email, { admin: false }, i, notify, 'Revoke admin ');
    }
    async reinvite(e, email, notify) {
        e.preventDefault();
        e.stopPropagation();
        let res = (await api({ invite: { params: { emails: [email],
                                                   reinvite: true } } })).invite;
        if (!res) {
            notify.add_notify('fas fa-info-circle text-red',
                              'Invitation failed', '', 20);
            return;
        }
        let success = 0;
        if (res[0] === true) {
            notify.add_notify('fas fa-check text-green',
                              `${email} reinvited`, '', 20);
        }
        else {
            notify.add_notify('fas fa-info-circle text-red',
                              'Cannot reinvite ' + email, res[0], 20);
        }
    }
    invite_users = async (e, notify) => {
        e.preventDefault();
        e.stopPropagation();
        let emails = [];
        let lines = this.state.invite_emails.split('\n');
        for (let i in lines) {
            let l = lines[i];
            l = l.trim();
            if (!l)
                continue;
            if (l.substr(-1) === ',' || l.substr(-1) === ';')
                l = l.substr(0, l.length - 1).trim();
            if (!l)
                continue;
            emails.push(l);
        }
        if (!emails.length) {
            notify.add_notify('fas fa-info-circle text-red',
                              'No email entered for invitation', '', 20);
            return;
        }
        this.setState({ invite_emails: '' });
        let res = (await api({ invite: { params: { emails } } })).invite;
        if (!res) {
            notify.add_notify('fas fa-info-circle text-red',
                              'Invitation failed', '', 20);
            return;
        }
        let success = 0;
        for (let i in res) {
            let r = res[i];
            if (r === true) {
                success += 1;
                continue;
            }
            notify.add_notify('fas fa-info-circle text-red',
                              'Cannot invite ' + emails[i], res[i], 20);
        }
        if (success) {
            notify.add_notify('fas fa-check text-green',
                              `Successfully invited ${success} users`, '', 20);
        }
        this.refresh();
    }
    async do_remove_email(email, notify) {
        let res = (await api({ remove_user: { params: { email } } })).remove_user;
        if (!res)
            notify.add_notify('fas fa-info-circle text-red',
                              `Removing ${email} failed`, '', 20);
        this.refresh();
    }

    _close_modal = () => {
        this.setState({ remove_email: null });
    }
    _remove_email = (notify) => {
        this.do_remove_email(this.state.remove_email, notify);
        this._close_modal();
    }
    _confirm_remove = (e, email) => {
        e.preventDefault();
        e.stopPropagation();
        this.setState({ remove_email: email });
    }
    invite_emails_change = (e) => {
        this.setState({ invite_emails: event.target.value });
    }
    render() {
        return <Wrapper>
          <CheckLogin admin={true}>
            <NotifyContext.Consumer>
              {ctx => this.render_real(ctx)}
            </NotifyContext.Consumer>
          </CheckLogin>
        </Wrapper>;
    }
    render_real(notify) {
        let user = this.context.user;
        let rows = [];
        let pad = <span style={{paddingRight: "6px"}}/>;
        for (let i in this.state.all_users) {
            let info = this.state.all_users[i];
            let is_self = info.email == user.email;
            if (!info.requested && this.state.request_only)
                continue;
            let ap;
            if (info.approved) {
                ap = <React.Fragment>
                  <span className="fas fa-check text-green"/>
                  {
                      is_self ? '' : <React.Fragment>
                        <span style={{paddingRight: "6px"}}/>
                        <button className="btn btn-danger btn-sm"
                          onClick={(e) => this.revoke_approve(e, info.email, i, notify)}>Revoke</button>
                      </React.Fragment>
                  }
                </React.Fragment>;
            }
            else {
                ap = <React.Fragment>
                  <button className="btn btn-success btn-sm"
                    onClick={(e) => this.approve(e, info.email, i, notify)}>Approve</button>
                  <span style={{paddingRight: "6px"}}/>
                  <button className="btn btn-danger btn-sm"
                    onClick={(e) => this._confirm_remove(e, info.email)}>
                    <span className="fas fa-trash"/>
                  </button>
                </React.Fragment>;
            }
            let req = '';
            if (info.requested) {
                req = <React.Fragment>
                  <span className="fas fa-info text-blue"/>
                  <span style={{paddingRight: "6px"}}/>
                  <button className="btn btn-danger btn-sm"
                    onClick={(e) => this.ignore_request(e, info.email, i, notify)}>Ignore</button>
                </React.Fragment>;
            }
            else if (info.approved && !info.verified) {
                req = <React.Fragment>
                  <span style={{paddingRight: "6px"}}/>
                  <button className="btn btn-success btn-sm"
                    onClick={(e) => this.reinvite(e, info.email, notify)}>Reinvite</button>
                </React.Fragment>;
            }
            let ad;
            if (is_self) {
                ad = <span className="fas fa-check text-green"/>;
            }
            else if (info.admin) {
                ad = <React.Fragment>
                  <span className="fas fa-check text-green"/>
                  <span style={{paddingRight: "6px"}}/>
                  <button className="btn btn-danger btn-sm"
                    onClick={(e) => this.revoke_admin(e, info.email, i, notify)}>Revoke admin</button>
                </React.Fragment>;
            }
            else {
                ad = <button className="btn btn-info btn-sm"
                       onClick={(e) => this.grant_admin(e, info.email, i, notify)}>Grant admin</button>;
            }
            rows.push(<tr key={i}>
              <th scope="row">{info.email}</th>
              <td>{ap}</td>
              <td>{req}</td>
              <td>{ad}</td>
            </tr>);
        }

        let modal_widget = <Modal onHide={this._close_modal} show={!!this.state.remove_email}>
          <Modal.Header><b>Confirm removing user</b></Modal.Header>
          <Modal.Body>
            <p>Are you sure you want to remove {this.state.remove_email}</p>
            <p>This cannot be undone.</p>
          </Modal.Body>
          <Modal.Footer>
            <button className="btn btn-danger"
              onClick={() => this._remove_email(notify)}>Remove</button>
            <button className="btn btn-secondary"
              onClick={this._close_modal}>Close</button>
          </Modal.Footer>
        </Modal>;

        return <div style={{width: "100%"}}>
          <legend className="text-center">Manage Users</legend>
          <div className="row">
            <div className="col text-center">
              <div className="form-check-inline">
                <input type="checkbox" className="form-check-input"
                  checked={this.state.request_only} onChange={this.request_only_change}/>
                <label className="form-check-label text-bold">Only show requested</label>
              </div>
            </div>
          </div>
          <div style={{width: "100%", overflowX: "scroll"}}>
            <table className="table table-striped table-hover mb-0"
              style={{whiteSpace: "nowrap"}}>
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Approved</th>
                  <th>Request</th>
                  <th>Admin</th>
                </tr>
              </thead>
              <tbody>
                {rows}
              </tbody>
            </table>
          </div>
          <legend className="text-center">Invitations</legend>
          <div style={{margin: "8px"}} className="text-center">
            <textarea style={{width: "100%", resize: "vertical"}}
              placeholder="One email per line" onChange={this.invite_emails_change}
              value={this.state.invite_emails}/>
            <span style={{padding: "6px"}}/>
            <button className="btn btn-sm btn-primary"
              style={{minWidth: "50%"}}
              onClick={(e) => this.invite_users(e, notify)}>Invite</button>
          </div>
          {modal_widget}
        </div>;
    }
}
