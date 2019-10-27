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

/**
 * This is a wrapper module to load a different version of function
 * when running on the client vs server.
 * See `next.config.js` for the necessary configuration for webpack.
 *
 * When running on the server, we directly get the data by calling the corresponding
 * module.
 *
 * When running on the client, we send a POST request to call the API.
 * The express server handles the request and call the server version of the function
 * to get the data. The request arguments and results are encoded as JSON.
 *
 * The separation of the server and client version is partially inspired by
 * the next-express package. However, next-express requires putting part of the logic
 * in the server without an obvious way to trace it from the page itself.
 *
 * Ideally, the properties that I want for the API caller in decreasing importance are,
 * 1. If the component is rendered on the server,
 *    the server implementation should be called directly without making a web request.
 * 2. The call should pick the correct version of the code automatically
 *    and without sending the server implementation to the client.
 * 3. The server implementation should be normal node module easy for outside
 *    code to interact with.
 * 4. The component that uses the data should contain enough information for
 *    a reader to find the server implementation.
 * 5. It should be possible for the server implementation to be in the same file
 *    as the component.
 *
 * The last one is not **as** important if the server implementation for the API caller
 * can be called in a similar way as loading (`require`ing) a module.
 *
 * The 3rd requirement alone, which is useful for implementing backend logic,
 * means that we have to do something about webpack otherwise any code called from
 * the component will be bundled. It also means that the logic can't be in the same file
 * as the component since I couldn't find a way to call the compiled component without
 * going through Next.js.
 *
 * OTOH, once we configured webpack to ignore certain files properly,
 * all the other requirements are much easier to satisfy. We just need a require-like
 * API that uses different implementations on the client or the server.
 * The two versions can be done with a simple check of `process.browser` during module loading
 * or can probably also be done using monkey patching for the server version...
 * The `require-like` interface should make it easier to find the implementation of the
 * API from the components.
 */

module.exports = (process.browser ? require('./api_client') :
                  require('../server/api'));
