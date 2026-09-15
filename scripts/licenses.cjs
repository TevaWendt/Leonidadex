/* Explicit allowlist; a CC BY prefix does not imply that NC/ND is permitted. */
module.exports = value => typeof value === 'string' && /^(?:CC0(?:[ -]1\.0)?|CC[ -]BY(?:[ -]SA)?(?:[ -](?:1\.0|2\.0|2\.5|3\.0|4\.0))?|Public domain|PD(?:[ -](?:old|US|self))?|Attribution(?:[ -]ShareAlike)?)$/i.test(value.trim());
