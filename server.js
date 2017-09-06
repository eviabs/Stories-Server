/**
 * Manages the requests.
 */

// requires
express = require('express');
fileUpload = require('express-fileupload');
ADODB = require('node-adodb');
util = require('util');

// consts
const CONNECTION_STRING = "Provider=Microsoft.ACE.OLEDB.12.0;Data Source=db\\db.accdb;Persist Security Info=False;";
const DB_UNIQUE_TOKEN = "unique_token";
const NODE_ADODB_BUG_MSG = "Operation is not allowed when the object is closed.";
const SOUND = "sound";
const IMAGE = "image";

// users table
var users_row_user_name = "user_name";
var users_row_user_password = "user_password";
var users_row_user_mail = "user_mail";


module.exports = {

    /**
     * Uploads a file to the server
     *
     * @param req
     * @param res
     */
    upload_file: function (req, res) {
        if (!req.files) {
            return res.status(400).send('No files were uploaded.');
        }

        var data_type = req.query.type;

        // Image params
        var image_file = req.files["file0"];
        var story_address = req.query.story_address;
        var story_name = req.query.story_name;
        var story_tags = req.query.story_tags;
        var story_latitude = req.query.story_latitude;
        var story_longitude = req.query.story_longitude;

        // Sound params
        var sound_file = req.files["file1"];
        var previous_recording_id = req.query.previous_recording_id;
        var recording_file_duration = req.query.recording_file_duration;
        var coord_id = req.query.coord_id; // if sound we also need:

        // Mutual params
        var timestamp = Date.now().toString();
        var user_id = req.query.user_id;
        var file_name = "_" + user_id + "_" + timestamp;

        switch (data_type) {

            // Upload audio file (and insert the corresponding "Recording" db record)
            case "recording":

                // Search if the coord exists
                //run_sql_query("SELECT * FROM [recording] WHERE recording_coord_id = " + coord_id + ";", function (data) {
                run_sql_query("SELECT * FROM [coords] WHERE coord_id = " + coord_id + ";", function (data) {

                    if (data.records.length !== 0) {

                        // Save audio file
                        sound_file.mv('storage/sound/' + SOUND + file_name, function (err) {
                            // if error
                            if (err) {
                                res.header("Content-Type", "application/json; charset=utf-8").status(500);
                                res.end(JSON.stringify("internal error", null, 4));
                            }

                            // Add sound file entry
                            run_insert_sql_query("files", ["file_path", "file_type"], ["'" + SOUND + file_name + "'", "'" + "sound" + "'"],
                                function (data) {
                                    // success - insert new recording entry
                                    run_insert_sql_query("recording", ["recording_file_id", "recording_user_id", "recording_coord_id", "recording_previous_recording_id", "recording_file_duration"], [data.records[0].file_id, user_id, coord_id, previous_recording_id, recording_file_duration],
                                        function (data) {
                                            // success
                                            res.header("Content-Type", "application/json; charset=utf-8");
                                            res.end(JSON.stringify(data.records[0], null, 4));
                                        });
                                });

                        });

                    } else {
                        res.header("Content-Type", "application/json; charset=utf-8").status(500);
                        res.end(JSON.stringify("no such coord", null, 4));
                    }
                });
                break;

            case "story":
                console.log("story");
                // Save audio file
                sound_file.mv('storage/sound/' + SOUND + file_name, function (err) {
                    // if error
                    if (err) {
                        res.header("Content-Type", "application/json; charset=utf-8").status(500);
                        res.end(JSON.stringify("internal error", null, 4));
                    } else {
                        // Save image file
                        image_file.mv('storage/image/' + IMAGE + file_name, function (err) {
                            // if error
                            if (err) {
                                res.header("Content-Type", "application/json; charset=utf-8").status(500);
                                res.end(JSON.stringify("internal error", null, 4));
                            } else {

                                var sound_id;
                                var image_id;
                                var story_id;
                                var route_id;
                                var coord_id;
                                var recording_id;

                                run_insert_sql_query("files", ["file_path", "file_type"], [quote(SOUND + file_name), quote(SOUND)], function (sound_data) {
                                    sound_id = sound_data.records[0].file_id;

                                    run_insert_sql_query("files", ["file_path", "file_type"], [quote(IMAGE + file_name), quote(IMAGE)], function (image_data) {
                                        image_id = image_data.records[0].file_id;

                                        run_insert_sql_query("stories", ["story_address", "story_name", "story_user_id", "story_image_file_id"], [quote(story_address), quote(story_name), user_id, image_id], function (story_data) {
                                            story_id = story_data.records[0].story_id;

                                            run_insert_sql_query("routes", ["story_id"], [story_id], function (root_data) {
                                                route_id = root_data.records[0].route_id;

                                                run_insert_sql_query("coords", ["coord_route_id", "coord_latitude", "coord_longitude", "coord_order", "coord_user_id"], [route_id, story_latitude, story_longitude, 1, user_id], function (coord_data) {
                                                    coord_id = coord_data.records[0].coord_id;

                                                    run_insert_sql_query("recording", ["recording_file_id", "recording_user_id", "recording_coord_id", "recording_previous_recording_id", "recording_file_duration"], [sound_id, user_id, coord_id, -1, recording_file_duration], function (recording_data) {
                                                        recording_id = recording_data.records[0].recording_id;

                                                        insert_tags(story_tags, story_id, function () {
                                                            sql_commad = "select * from (select t2.story_id as story_id, story_address, story_name, story_user_id , file_path as story_file_path, user_name as story_user_name, story_creation_date ,coord_latitude as story_coord_latitude ,coord_longitude as story_coord_longitude from (select * from (SELECT coords.coord_latitude, coords.coord_longitude, stories.story_id FROM (routes INNER JOIN coords ON routes.route_id = coords.[coord_route_id]) INNER JOIN stories ON routes.story_id = stories.story_id WHERE (((coords.coord_order)=1)))) t1 INNER JOIN (select * from (SELECT stories.story_id, stories.story_address, stories.story_name, stories.story_user_id, files.file_path, users.user_name, stories.story_creation_date, stories.story_image_file_id FROM files INNER JOIN (users INNER JOIN stories ON users.[user_id] = stories.[story_user_id]) ON files.[file_id] = stories.[story_image_file_id])) t2 on t1.story_id = t2.story_id) where story_id =" + story_id + ";";
                                                            run_sql_query(sql_commad, function (story_select_data) {
                                                                var stories = story_select_data.records;
                                                                fill_tags(stories, function () {
                                                                    console.log(story_select_data.records);

                                                                    res.header("Content-Type", "application/json; charset=utf-8").status(200);
                                                                    res.end(JSON.stringify(stories, null, 4));
                                                                });
                                                            }, default_failure_callback(""))

                                                        })
                                                    });
                                                });
                                            });
                                        });
                                    });
                                });
                            }
                        });
                    }

                });
                break;
            // Otherwise, so such type
            default:
                res.end(JSON.stringify({error: "no such type"}, null, 4));
        }
    },

    /**
     * Gets a file from the server
     *
     * @param req
     * @param res
     */
    get_file: function (req, res) {
        var file_name = req.query.file_name;
        var file_type = req.query.file_type;
        var folder = (file_type === "sound") ? "sound" : "image";

        var file_to_down = __dirname + '/storage/' + folder + '/' + file_name;
        res.download(file_to_down); // Set disposition and send it.
    },

    /**
     * Gets data from the server
     *
     * @param req
     * @param res
     */
    get_data: function (req, res) {

        var data_type = req.query.type;
        var sql_commad = "";

        switch (data_type) {
            // Get user details by user_name or user_id
            case "user":

                var user_id = req.query.user_id;
                var user_name = req.query.user_name;

                // default query (search by user_id)
                sql_commad = "SELECT * FROM [users] WHERE user_id = " + user_id + ";";

                // search by user_name
                if (user_id === undefined) {
                    sql_commad = "SELECT * FROM [users] WHERE user_name = '" + user_name + "';";
                }
                // run query
                run_sql_query(sql_commad, function (data) {
                    res.header("Content-Type", "application/json; charset=utf-8");
                    res.end(JSON.stringify(data.records, null, 4));
                });
                break;

            // Get Ratings of records
            case "login":

                user_name = req.query.user_name;
                var user_password = req.query.user_password;

                sql_commad = "SELECT user_id FROM users WHERE user_name = '" + user_name + "' and user_password = '" + user_password + "';";

                // run query
                run_sql_query(sql_commad, function (data) {
                    res.header("Content-Type", "application/json; charset=utf-8");
                    res.end(JSON.stringify(data.records, null, 4));
                });
                break;

            // Get story
            case "story":
                // get all stories (no filters are applied during the db querying)

                // if story_id query was used, refine the select statement with the desired id
                var by_id = (req.query.story_id !== undefined) ? "WHERE t2.story_id=" + req.query.story_id : "";
                sql_commad = "select t2.story_id as story_id, story_address, story_name, story_user_id , file_path as story_file_path, user_name as story_user_name, story_creation_date ,coord_latitude as story_coord_latitude ,coord_longitude as story_coord_longitude from (select * from (SELECT coords.coord_latitude, coords.coord_longitude, stories.story_id FROM (routes INNER JOIN coords ON routes.route_id = coords.[coord_route_id]) INNER JOIN stories ON routes.story_id = stories.story_id WHERE (((coords.coord_order)=1)))) t1 INNER JOIN (select * from (SELECT stories.story_id, stories.story_address, stories.story_name, stories.story_user_id, files.file_path, users.user_name, stories.story_creation_date, stories.story_image_file_id FROM files INNER JOIN (users INNER JOIN stories ON users.[user_id] = stories.[story_user_id]) ON files.[file_id] = stories.[story_image_file_id])) t2 on t1.story_id = t2.story_id " + by_id + "; ";

                run_sql_query(sql_commad, function (data) {
                    var stories = data.records;
                    var story_lat = req.query.story_lat;
                    var story_lon = req.query.story_lon;
                    var dist = req.query.dist;

                    console.log(data.records);
                    if (story_lat !== undefined && story_lon !== undefined && dist !== undefined) {

                        stories = [];

                        for (var i = 0; i < data.records.length; ++i) {
                            if (distance_between_coordinates(story_lat, story_lon, data.records[i].story_coord_latitude, data.records[i].story_coord_longitude) <= dist) {
                                stories.push(data.records[i]);
                            }
                        }
                    }

                    fill_tags(stories, function () {
                        res.header("Content-Type", "application/json; charset=utf-8");
                        res.end(JSON.stringify(stories, null, 4));
                    });

                });
                break;

            // Get routes of story
            case "route":

                var story_id = req.query.story_id;
                sql_commad = "SELECT route_id FROM [routes] WHERE story_id = " + story_id + ";";

                // run query
                run_sql_query(sql_commad, function (data) {
                    res.header("Content-Type", "application/json; charset=utf-8");
                    res.end(JSON.stringify(data.records, null, 4));
                });
                break;

            // Get Coords of route
            case "coord":

                var route_id = req.query.route_id;
                var story_id = req.query.story_id;

                if (route_id !== undefined) {

                    sql_commad = "SELECT coords.coord_id, routes.story_id AS coord_story_id, coords.coord_route_id AS coord_route_id, coords.coord_latitude, coords.coord_longitude, coords.coord_order, coords.coord_creation_date, users.user_name AS coord_user_name FROM ((users INNER JOIN stories ON users.[user_id] = stories.[story_user_id]) INNER JOIN routes ON stories.[story_id] = routes.[story_id]) INNER JOIN coords ON routes.[route_id] = coords.[coord_route_id]" +
                        " WHERE coords.coord_route_id = " + route_id + ";";
                } else {
                    sql_commad = "SELECT coords.coord_id, routes.story_id AS coord_story_id, coords.coord_route_id AS coord_route_id, coords.coord_latitude, coords.coord_longitude, coords.coord_order, coords.coord_creation_date, users.user_name AS coord_user_name FROM ((users INNER JOIN stories ON users.[user_id] = stories.[story_user_id]) INNER JOIN routes ON stories.[story_id] = routes.[story_id]) INNER JOIN coords ON routes.[route_id] = coords.[coord_route_id]" +
                        " WHERE stories.[story_id] = " + story_id + ";";
                }

                // run query
                run_sql_query(sql_commad, function (data) {
                    res.header("Content-Type", "application/json; charset=utf-8");
                    res.end(JSON.stringify(data.records, null, 4));
                });
                break;

            // Get Recordings of route
            case "recording":

                var coord_id = req.query.coord_id;

                // Recording query
                sql_commad = "SELECT recording.recording_id, recording.recording_creation_date, recording.recording_coord_id, recording.recording_previous_recording_id, recording.recording_file_duration, users.user_name AS recording_user_name, files.file_path AS recording_file_path FROM users INNER JOIN (files INNER JOIN recording ON files.[file_id] = recording.[recording_file_id]) ON users.[user_id] = recording.[recording_user_id]" + "WHERE recording_coord_id = " + coord_id + ";";

                // run query
                run_sql_query(sql_commad, function (data) {
                    recordings = data.records;

                    console.log(recordings);
                    sql_commad_ratings = "SELECT rating_value, rating_recording_id FROM ratings";

                    // TODO: Very bad design, better do this on the DB itself with an sql command
                    // No time for this atm!

                    // Create another call that calculates ALL of the ratings averages, and appends ONLY the relevant one.
                    run_sql_query(sql_commad_ratings, function (data) {

                        // Use js objects as hashmaps:
                        var ratings = {};
                        var ratings_counts = {};

                        // sum up the ratings and count the items
                        for (var i = 0; i < data.records.length; ++i) {
                            ratings[data.records[i].rating_recording_id] = (ratings[data.records[i].rating_recording_id]) ? ratings[data.records[i].rating_recording_id] + data.records[i].rating_value : data.records[i].rating_value;
                            ratings_counts[data.records[i].rating_recording_id] = (ratings_counts[data.records[i].rating_recording_id]) ? ratings_counts[data.records[i].rating_recording_id] + 1 : 1;

                        }

                        // append only relevant ratings
                        for (i = 0; i < recordings.length; ++i) {
                            if (ratings[recordings[i].recording_id]) {
                                recordings[i].recording_rating = ratings[recordings[i].recording_id] / ratings_counts[recordings[i].recording_id];
                            } else {
                                recordings[i].recording_rating = -1;
                            }
                        }

                        res.header("Content-Type", "application/json; charset=utf-8");
                        res.end(JSON.stringify(recordings, null, 4));
                    });
                });
                break;

            // Get Ratings of records
            case "rating":

                var rating_recording_id = req.query.rating_recording_id;

                sql_commad = "SELECT * FROM ratings WHERE rating_recording_id = " + rating_recording_id + ";";

                // run query
                run_sql_query(sql_commad, function (data) {
                    res.header("Content-Type", "application/json; charset=utf-8");
                    res.end(JSON.stringify(data.records, null, 4));
                });
                break;

            // Otherwise, so such type
            default:
                res.end(JSON.stringify({error: "no such type"}, null, 4));
        }
    },

    /**
     * Sets data to the server's DB
     *
     * @param req
     * @param res
     */
    set_data: function (req, res) {
        var data_type = req.query.type;
        var sql_commad = "";

        switch (data_type) {
            // Set Users
            case "user":
                var user_name = req.query[users_row_user_name];
                var user_password = req.query[users_row_user_password];
                var user_mail = req.query[users_row_user_mail];

                // Search user by user_name
                run_sql_query("SELECT * FROM [users] WHERE user_name = '" + user_name + "';", function (data) {

                    if (data.records.length === 0) {
                        run_insert_sql_query("users", [users_row_user_name, users_row_user_password, users_row_user_mail], ["'" + user_name + "'", "'" + user_password + "'", "'" + user_mail + "'"],
                            function (data) {
                                // success - delete sensitive data
                                delete data.records[0][users_row_user_password];

                                res.header("Content-Type", "application/json; charset=utf-8");
                                res.end(JSON.stringify(data.records[0], null, 4));
                            });

                    } else {
                        res.header("Content-Type", "application/json; charset=utf-8");
                        res.end(JSON.stringify("taken", null, 4));
                    }
                });
                break;

            // Set Ratings
            case "rating":
                var rating_recording_id = req.query["rating_recording_id"];
                var rating_user_id = req.query["rating_user_id"];
                var rating_value = req.query["rating_value"];

                // Search by user_name
                run_sql_query("SELECT * FROM [users] WHERE user_id = " + rating_user_id + ";", function (data) {

                    if (data.records.length !== 0) {

                        // Search by record_id
                        run_sql_query("SELECT * FROM [recording] WHERE recording_id = " + rating_recording_id + ";", function (data) {

                            if (data.records.length !== 0) {

                                if (rating_value >= 0 && rating_value <= 5) {
                                    run_insert_sql_query("ratings", ["rating_recording_id", "rating_user_id", "rating_value"], [rating_recording_id, rating_user_id, rating_value],
                                        function (data) {

                                            res.header("Content-Type", "application/json; charset=utf-8");
                                            res.end(JSON.stringify(data.records[0], null, 4));
                                        });
                                } else {
                                    res.header("Content-Type", "application/json; charset=utf-8");
                                    res.end(JSON.stringify("illegal rating", null, 4));
                                }

                            } else {
                                res.header("Content-Type", "application/json; charset=utf-8");
                                res.end(JSON.stringify("no such recording", null, 4));
                            }
                        });

                    } else {
                        res.header("Content-Type", "application/json; charset=utf-8");
                        res.end(JSON.stringify("no such user", null, 4));
                    }
                });
                break;

            // Set Coords
            case "coord":
                var coord_user_id = req.query["coord_user_id"];
                var coord_route_id = req.query["coord_route_id"];
                var coord_latitude = req.query["coord_latitude"];
                var coord_longitude = req.query["coord_longitude"];

                // Search  user by user_name
                run_sql_query("SELECT max(coord_order) as maxi FROM [coords] WHERE coord_route_id = " + coord_route_id + ";", function (data) {

                    if (data.records.length !== 0) {
                        var coord_order = data.records[0].maxi + 1;
                        run_insert_sql_query("coords", ["coord_route_id", "coord_latitude", "coord_longitude", "coord_order", "coord_user_id"], [coord_route_id, coord_latitude, coord_longitude, coord_order, coord_user_id],
                            function (data) {
                                // success - delete sensitive data

                                res.header("Content-Type", "application/json; charset=utf-8");
                                res.end(JSON.stringify(data.records[0], null, 4));
                            });

                    } else {
                        res.header("Content-Type", "application/json; charset=utf-8");
                        res.end(JSON.stringify("no such route", null, 4));
                    }
                });
                break;
            // Otherwise, so such type
            default:
                res.end(JSON.stringify({error: "no such type"}, null, 4));
        }
    },

    /**
     * Gets a story object by its id. Used internally by the server.
     *
     * @param id
     * @param callback
     */
    get_story: function (id, callback) {
        var by_id = "WHERE t2.story_id=" + id;
        sql_commad = "select t2.story_id as story_id, story_address, story_name, story_user_id , file_path as story_file_path, user_name as story_user_name, story_creation_date ,coord_latitude as story_coord_latitude ,coord_longitude as story_coord_longitude from (select * from (SELECT coords.coord_latitude, coords.coord_longitude, stories.story_id FROM (routes INNER JOIN coords ON routes.route_id = coords.[coord_route_id]) INNER JOIN stories ON routes.story_id = stories.story_id WHERE (((coords.coord_order)=1)))) t1 INNER JOIN (select * from (SELECT stories.story_id, stories.story_address, stories.story_name, stories.story_user_id, files.file_path, users.user_name, stories.story_creation_date, stories.story_image_file_id FROM files INNER JOIN (users INNER JOIN stories ON users.[user_id] = stories.[story_user_id]) ON files.[file_id] = stories.[story_image_file_id])) t2 on t1.story_id = t2.story_id " + by_id + "; ";

        run_sql_query(sql_commad, function (data) {
            callback(data.records[0]);
        });
    },
    /**
     * Used for testing
     * @param req
     * @param res
     */
    test: function (req, res) {
        insert_tags(escape("z'i"), 1, function (data) {
            res.header("Content-Type", "application/json; charset=utf-8");
            res.end(JSON.stringify(data, null, 4));
        });
    }
};

// =====================================================================
// =========================   Utils     ===============================
// =====================================================================
/**
 * Runs SQL queries.
 * ATM working with Access DB.
 *
 * @param query
 * @param success
 * @param failure
 */
function run_sql_query(query, success, failure) {

    // if no failure was given, use the default one
    if (failure === undefined) {
        failure = default_failure_callback;
    }

    // Log adodb errors
    ADODB.debug = true;


    // Connect to the MS Access DB
    var connection = ADODB.open(CONNECTION_STRING);

    // Query the DB

    connection.query(query).on('done', success).on('fail', failure);
}

/**
 * Since node-adodb has this bug: https://github.com/nuintun/node-adodb/issues/9
 * one cannot distinguish between a succeeded and a failed insert commands,
 * so we will insert a unique token for each row, and then select it to check if the insertion did happen.
 *
 * @param table
 * @param fields
 * @param values
 * @param success
 * @param failure
 */
function run_insert_sql_query(table, fields, values, success, failure) {

    // if no failure was given, use the default one
    if (failure === undefined) {
        failure = default_failure_callback;
    }

    // build insertion query
    var current_unique_token = get_unique_token();
    var arr_to_sql = ["INSERT INTO " + table + "(" + Array(fields.length + 1).join("%s,") + DB_UNIQUE_TOKEN + ")" + " VALUES (" + Array(values.length + 1).join("%s,") + current_unique_token + ");"];
    arr_to_sql = arr_to_sql.concat(fields).concat(values);
    sql_commad_insert = util.format.apply(util, arr_to_sql);

    if (table === "tags") {
        current_unique_token = values[0];
         sql_commad_insert = "insert into tags (tag_name, unique_token) Select distinct " + current_unique_token + ", " + current_unique_token + " from tags Where not exists(select * from tags where tag_name=" + current_unique_token + " and unique_token=" + current_unique_token + ");";
        //sql_commad_insert = "insert into tags (tag_name) values (" + quote(current_unique_token) + ") WHERE not exists(select * from tags where tag_name=" + quote(current_unique_token) + ");";
    }
    // run it as a normal query
    run_sql_query(sql_commad_insert, function (data) {
            // success
            success(data);
        },
        function (data) {
            if (data.message === NODE_ADODB_BUG_MSG) {
                // on failure: check if value was inserted correctly
                run_sql_query("SELECT * FROM " + table + " WHERE unique_token = " + current_unique_token + ";", function (data) {
                        // if exists, all'a good
                        if (data.records !== 0) {
                            success(data);
                        } else {
                            console.log("nothing was inserted!");
                            failure(data);
                        }
                    },
                    function (data) {
                        console.log("error occurred when verifying insertion!");
                        failure(data);
                    });
            } else {
                console.log("insertion failed");
                failure(data);
            }
        });
}

/**
 * Gets a unique token
 *
 * @returns {string}
 */
function get_unique_token() {
    // return "'" + new Date().getMilliseconds() + Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 10) + "'";
    return quote(new Date().getMilliseconds() + Math.random().toString(36).replace(/[^a-z]+/g, ''));
}
/**
 * Calculates distance between 2 coords
 * @param lat1
 * @param lon1
 * @param lat2
 * @param lon2
 * @returns {number}
 */
function distance_between_coordinates(lat1, lon1, lat2, lon2) {
    var R = 6371; // km
    var dLat = to_rad(lat2-lat1);
    var dLon = to_rad(lon2-lon1);
    lat1 = to_rad(lat1);
    lat2 = to_rad(lat2);

    var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

/**
 * Converts numeric degrees to radians
 *
 * @param value
 * @returns {number}
 */
function to_rad(value) {
    return value * Math.PI / 180;
}

/**
 * Fetches the tags of each story, and adds them as a new record attribute
 *
 * @param stories
 * @param callback
 */
function fill_tags(stories ,callback) {

    // counter for stories  that still need to get their tags
    var count_stories_to_tag = stories.length;

    // the sql command that gets a single story's tags
    var sql_command_tags = "SELECT tags.tag_name, stories_tags.stories_tags_story_id FROM tags INNER JOIN stories_tags ON tags.[tag_id] = stories_tags.[stories_tags_tag_id] WHERE stories_tags.stories_tags_story_id = ";

    // loop through the stories
    for (var i = 0; i < stories.length; ++i) {

        // create async call for EACH story
        run_sql_query(sql_command_tags + stories[i].story_id + ";", function (data) {

            // search for the current story (by its ID)
            for (var j = 0; j < stories.length; ++j) {
                if (data.records[0] !== undefined && stories[j].story_id === data.records[0].stories_tags_story_id) {
                    var tags = "";
                    // concatenate tags using ";"
                    for (var k = 0; k < data.records.length; ++k) {
                        tags += data.records[k].tag_name + ";";
                    }

                    // ignore the last char (if exists)
                    stories[j].story_tags = (tags.length <= 0) ? "" : tags.substr(0, tags.length - 1);
                }
            }

            // update counter so we know when all async calls have finished
            count_stories_to_tag --;
            if (count_stories_to_tag <= 0) {
                callback();
            }
        });
    }
}

/**
 * Insert tags into the db
 * @param tags
 * @param story_id
 * @param callback
 */
function insert_tags(tags, story_id ,callback) {

    // counter for stories  that still need to get their tags
    var tags_names = tags.split(";");
    var count_tags = tags_names.length;
    var tags_ids = [];

    // insert all tags
    for (var i = 0; i < count_tags; ++i) {

        // create async call for EACH story
        run_insert_sql_query("tags", ["tag_name"], [quote(tags_names[i])], function (tags_data) {
            tags_ids.push(tags_data.records[0].tag_id);

            count_tags --;
            if (count_tags <= 0) {
                insert_story_tags(tags_ids, story_id, callback)
            }
        })
    }
}

/**
 * Insert tags onto the relation tags-stories
 * @param tags_ids
 * @param story_id
 * @param callback
 */
function insert_story_tags(tags_ids, story_id ,callback) {

    // counter for stories  that still need to get their tags
    var count_tags = tags_ids.length;

    // inset all tags
    for (var i = 0; i < count_tags; ++i) {

        // create async call for EACH story
        run_insert_sql_query("stories_tags", ["stories_tags_story_id", "stories_tags_tag_id"], [story_id, tags_ids[i]], function (tags_data) {

            count_tags --;
            if (count_tags <= 0) {
                callback();
            }
        })
    }
}

/**
 * Default failure callback
 */
function default_failure_callback(data) {
    console.log("failed to execute sql command")
}

/**
 * Wrap a string with 's
 *
 * @param str
 * @returns {string}
 */
function quote(str) {
    return "'" + str + "'";
}

/**
 * Escape bad cahrs in a string
 *
 * @param str
 * @returns {XML|string|void}
 */
function escape(str) {
    return str.replace(/'/g,"''");
}