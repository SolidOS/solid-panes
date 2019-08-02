#
# Language names from ... https://www.omniglot.com/language/names.htm ??
# https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes
# https://lov.linkeddata.es/dataset/lov/terms?q=Language%20Code
# http://dbpedia.org/ontology/Language
#  https://schema.org/knowsLanguage -> Language

curl https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes > codes.html
tidy -m -asxml codes.html
# sed -e 's/&nbsp;//g' < codes.html > codes.xml
# python  /devel/github.com/linkeddata/swap/tab2n3.py -xhtml  < codes.xml > languageCodes.ttl
grep "<td lang" codes.html > codes2.txt
