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

import Document, { Head, Main, NextScript } from 'next/document'

// This is the template for all the pages.
// We load all the scripts and style sheets here and we leave the actual page template
// to another component to make it more flexible.
export default class Page extends Document {
    render() {
        return (
            <html>
              <Head>
                <meta httpEquiv="x-ua-compatible" content="ie=edge"/>

                {/* Bootstrap CSS */}
                <link rel="stylesheet"
                  href="https://stackpath.bootstrapcdn.com/bootstrap/4.1.3/css/bootstrap.min.css"
                  integrity="sha384-MCw98/SFnGE8fJT3GXwEOngsV7Zt27NXFoaoApmYm81iuXoPkFOJwJ8ERdknLPMO"
                  crossOrigin="anonymous"/>
                {/* Font Awesome Icons */}
                <link rel="stylesheet"
                  href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.11.2/css/all.min.css"
                  crossOrigin="anonymous"/>
                {/* Theme style */}
                <link rel="stylesheet"
                  href="https://cdn.jsdelivr.net/npm/admin-lte@3.0.1/dist/css/adminlte.min.css"
                  crossOrigin="anonymous"/>
                {/* Google Font: Source Sans Pro */}
                <link rel="stylesheet"
                  href="https://fonts.googleapis.com/css?family=Source+Sans+Pro:300,400,400i,700"
                  crossOrigin="anonymous"/>
                <link rel="stylesheet" href="/css/main.css"/>
              </Head>
              <body className="hold-transition sidebar-mini">
                <Main/>
                {/* Load jQuery before loading NextScript since we
                    may have code that uses jQuery */}
                {/* jQuery */}
                <script src="https://code.jquery.com/jquery-3.4.1.min.js"
                  integrity="sha256-CSXorXvZcTkaix6Yvo6HppcZGetbYMGWSFlBw8HfCJo="
                  crossOrigin="anonymous"></script>
                <NextScript/>
                {/* Bootstrap JS */}
                <script src="https://cdnjs.cloudflare.com/ajax/libs/popper.js/1.14.3/umd/popper.min.js"
                  integrity="sha384-ZMP7rVo3mIykV+2+9J3UJ46jBk0WLaUAdn689aCwoqbBJiSnjAK/l8WvCWPIPm49"
                  crossOrigin="anonymous"></script>
                <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.1.3/js/bootstrap.min.js"
                  integrity="sha384-ChfqqxuZUCnJSK3+MXmPNIyE6ZbWh2IMqE241rYiqJxyMiZ6OW/JmZQ5stwEULTy"
                  crossOrigin="anonymous"></script>
                {/* AdminLTE App */}
                <script src="https://cdn.jsdelivr.net/npm/admin-lte@3.0.1/dist/js/adminlte.min.js"
                  crossOrigin="anonymous"></script>
                {/* Used by lib/crypto_client.js */}
                <script src="https://cdnjs.cloudflare.com/ajax/libs/blueimp-md5/2.12.0/js/md5.min.js"
                  integrity="sha256-1K9nK/DlS1HHfbB3SmJz2qRfsW5Tgg/yimRBOHLmwk0="
                  crossOrigin="anonymous"></script>
              </body>
            </html>
        )
    }
}
