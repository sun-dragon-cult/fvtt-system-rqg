// /**
//  * @param {string} content data to translate
//  * @param {obj} options configuration object
//  * @return {obj} collection object with translations
//  */
// export function i18n(file, options, errors) {
//   var i18ns = {};
//
//   var stringContents = file.contents.toString();
//
//   options.locales.forEach(function (locale) {
//     var dict = options.dictionary[locale];
//     i18ns[locale] = null;
//
//     if (!isBinary) {
//       i18ns[locale] = stringContents.replace(options.regex, function ($0, $1) {
//         var match = lookup(dict, $1);
//         var notFound = match === undefined;
//
//         if (notFound) {
//           errors.push([$0, "translation missing in", locale]);
//         } else {
//           localizationMatchCount++;
//         }
//
//         return notFound ? $0 : match;
//       });
//     }
//   });
//
//   return i18ns;
// }

/**
 * @param {obj} dict dictionary object
 * @return {string} translated text
 */
export function lookup(dict: any, key: string) {
  const keyParts = key.split(".");

  const value = keyParts.reduce(function (acc, keyPart) {
    return (acc || {})[keyPart];
  }, dict);

  return value;
}
