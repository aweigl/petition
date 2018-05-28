var spicedPg = require("spiced-pg");
var db;

if (process.env.DATABASE_URL) {
    db = spicedPg(process.env.DATABASE_URL);
} else {
    db = spicedPg("postgres:postgres:postgres@localhost:5432/petition");
}

const getSignatures = (sig, userId) => {
    return db.query(
        `INSERT INTO signatures (signature, user_id) VALUES ($1, $2)
            RETURNING id`,
        [sig, userId]
    );
};

const getId = sigId => {
    return db.query("SELECT signature FROM signatures WHERE id=$1", [sigId]);
};

const getLength = () => {
    return db.query("SELECT count(*) FROM signatures");
};

const getSigners = () => {
    return db.query("SELECT first, last FROM signatures");
};

const insertUserInfo = (first, last, mail, pass) => {
    return db.query(
        "INSERT INTO users (first, last, email, pass) VALUES ($1, $2, $3, $4) RETURNING id",
        [first, last, mail, pass]
    );
};

const getUserInfo = mail => {
    return db.query("SELECT pass, id, first, last FROM users WHERE email=$1", [
        mail
    ]);
};

const getUserSigId = () => {
    return db.query(
        `SELECT users.first AS first, users.last AS last, users.email AS mail, signatures.signature AS signature, users.id AS id, signatures.id AS sigId FROM users JOIN signatures ON users.id = signatures.user_id`
    );
};

const insertUserProfile = (user_id, age, city, url) => {
    return db.query(
        "INSERT INTO user_profiles (user_id, age, city, url) VALUES ($1, $2, $3, $4)",
        [user_id, age, city, url]
    );
};

const getUserProfile = () => {
    return db.query(
        "SELECT signatures.id AS sigid, users.id AS userId, users.first AS first, users.last AS last, user_profiles.age AS age, user_profiles.city AS city, user_profiles.url AS homepage FROM signatures LEFT OUTER JOIN user_profiles ON signatures.user_id = user_profiles.user_id JOIN users ON signatures.user_id = users.id"
    );
};

const getSameCity = city => {
    return db.query(
        `SELECT signatures.id AS sigid, users.id AS userId, users.first AS first, users.last AS last, user_profiles.age AS age, user_profiles.city AS city, user_profiles.url AS homepage
        FROM signatures LEFT OUTER JOIN user_profiles ON signatures.user_id = user_profiles.user_id JOIN users ON signatures.user_id = users.id WHERE LOWER(user_profiles.city)=LOWER($1)`,
        [city]
    );
};

const updateUser = (first, last, email, id) => {
    return db.query(
        "UPDATE users SET first=$1, last=$2, email=$3 WHERE id=$4",
        [first || null, last || null, email || null, id || null]
    );
};

const updateUserPassword = (first, last, email, id, pass) => {
    return db.query(
        "UPDATE users SET first=$1, last=$2, email=$3, pass=$5 WHERE id=$4",
        [first, last, email, id, pass]
    );
};

const updateProfile = (userid, age, city, homepage) => {
    return db.query(
        "INSERT INTO user_profiles (user_id, age, city, url) VALUES ($1,$2,$3,$4) ON CONFLICT (user_id) DO UPDATE SET age=$2, city=$3, url=$4",
        [userid, age, city, homepage]
    );
};

const getUserOnId = id => {
    return db.query(
        `SELECT signatures.id AS sigid, users.email AS mail, users.id AS userId, users.first AS first, users.last AS last, user_profiles.age AS age, user_profiles.city AS city, user_profiles.url AS homepage
        FROM signatures LEFT OUTER JOIN user_profiles ON signatures.user_id = user_profiles.user_id JOIN users ON signatures.user_id = users.id WHERE users.id=$1`,
        [id]
    );
};

const deleteSignature = userid => {
    return db.query(`DELETE FROM signatures WHERE user_id=${userid}`);
};

exports.getSignatures = getSignatures;
exports.getId = getId;
exports.getLength = getLength;
exports.getSigners = getSigners;
exports.insertUserInfo = insertUserInfo;
exports.getUserInfo = getUserInfo;
exports.getUserSigId = getUserSigId;
exports.insertUserProfile = insertUserProfile;
exports.getUserProfile = getUserProfile;
exports.getSameCity = getSameCity;
exports.updateUserPassword = updateUserPassword;
exports.updateUser = updateUser;
exports.updateProfile = updateProfile;
exports.getUserOnId = getUserOnId;
exports.deleteSignature = deleteSignature;
