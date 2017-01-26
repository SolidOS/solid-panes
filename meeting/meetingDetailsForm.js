module.exports = `@prefix : <http://www.w3.org/ns/ui#> .
@prefix f: <#> .
@prefix dc: <http://purl.org/dc/elements/1.1/>.
@prefix cal: <http://www.w3.org/2002/12/cal/ical#>.
@prefix meeting: <http://www.w3.org/ns/pim/meeting#>.
@prefix ns: <http://www.w3.org/2006/vcard/ns#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>.
@prefix te: <http://purl.org/dc/terms/> .
@prefix dc: <http://purl.org/dc/elements/1.1/>.
@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.
@prefix ui: <http://www.w3.org/ns/ui#>.

  f:main    a :Form;
      cal:summary "Meeting Details";
      :part f:titleField, f:locationField, f:startField,
                    f:endField, f:eventComment, f:colorField .

  f:titleField     a :SingleLineTextField;
       :maxLength 256;
       :property cal:summary;
       :label "Name of meeting";
       :size 80 .

   f:locationField     a :SingleLineTextField;
        :maxLength 128;
        :property cal:location;
        :size 40 .

    f:startField     a :DateField;
        :label "Start";
         :property cal:dtstart .

   f:endField     a :DateField;
       :label "End";
          :property cal:dtend .

    f:colorField     a :ColorField;
        :label "Tab color";
  #      :default "#ddddcc"^^xsd:color;
           :property ui:backgroundColor .

      f:eventComment
           a    ui:MultiLineTextField;
       #    ui:maxLength
       #       "1048";
       #    ui:size
       #       "40".
           ui:property
              cal:comment.

###################################################

f:settings a :Form;
    dc:title "Tab settings";
    :part f:labelField, f:targetField, f:viewField.

    f:labelField     a :SingleLineTextField;
         :maxLength 128;
         :property rdfs:label;
         :label "Label on tab";
         :size 40 .

   f:targetField     a :NamedNodeURIField;
     :maxLength 1024;  # Longer?
     :property meeting:target;
     :label "URL of resource";
     :size 80 .

   f:colorField2     a :ColorField;
       :label "Tab color";
 #      :default "#ddddcc"^^xsd:color;
          :property ui:backgroundColor .

   f:viewField     a :SingleLineTextField;
        :maxLength 128;
        :property meeting:view;
        :label "View mode (experts only)";
        :size 40 .

#
`
