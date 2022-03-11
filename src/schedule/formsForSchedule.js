module.exports = `
@prefix dc: <http://purl.org/dc/elements/1.1/>.
@prefix foaf: <http://xmlns.com/foaf/0.1/>.
@prefix cal: <http://www.w3.org/2002/12/cal/ical#>.
@prefix ui: <http://www.w3.org/ns/ui#>.
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>.
@prefix sched: <http://www.w3.org/ns/pim/schedule#>.

   cal:Vevent ui:annotationForm <#form2>, <#form3>; ui:creationForm <#form1> .

<#bigForm>
    dc:title
       "Schedule event (single form).";
    a    ui:Group;
    ui:parts ( <#form1> <#form2> <#form3> ).

<#form1>
    dc:title
       "Schedule an event (wizard)";
    a    ui:Form;
    ui:parts (
        <#form1header>
        <#eventTitle>
        <#eventLocation>
        <#eventType>
        <#eventSwitch>
        <#eventComment>
        <#eventAuthor> ).

<#form1header> a ui:Heading; ui:contents "Schedule an event" .

<#eventTitle>
    a    ui:SingleLineTextField;
    ui:maxLength
       "128";
    ui:property
       cal:summary;
    ui:size
       "40".

<#eventLocation>
    a    ui:SingleLineTextField;
    ui:maxLength
       "512";
    ui:property
       cal:location;
    ui:size
       "40".

<#eventType> a ui:BooleanField;
  ui:property sched:allDay;
  ui:default true . # Used to be the only way

<#eventSwitch> a ui:Options;
  ui:dependingOn sched:allDay;
  ui:case [ ui:for true; ui:use <#AllDayForm> ];
  ui:case [ ui:for false; ui:use <#NotAllDayForm> ].

  <#AllDayForm> a ui:IntegerField ;
    ui:property sched:durationInDays;
    ui:label "How many days?";
    ui:min 1;
    ui:default 1 .

  <#NotAllDayForm> a ui:IntegerField ;
    ui:property sched:durationInMinutes;
    ui:label "Duration (mins)";
    ui:min 5;
    ui:default 55 .

<#eventComment>
    a    ui:MultiLineTextField;
#    ui:maxLength
#       "1048";
#    ui:size
#       "40".
    ui:property
       cal:comment.

<#eventAuthor>
   a ui:Multiple; ui:min 1; ui:part <#eventAuthorGroup>; ui:property dc:author.

   <#eventAuthorGroup> a ui:Group; ui:parts ( <#authorName> <#authorEmail> ) .
   <#authorName> a ui:SingleLineTextField; ui:property foaf:name .
   <#authorEmail> a ui:EmailField; ui:label "email"; ui:property foaf:mbox .


#####################

<#form2> dc:title "Select possible days or times"; a ui:Form;
        ui:parts ( <#id1118132113134> <#possibleSwitch> ).

    <#id1118132113134> a ui:Heading; ui:contents "Time proposals" .

    <#possibleSwitch> a ui:Options;
      ui:dependingOn sched:allDay;
      ui:case [ ui:for true; ui:use <#AllDayForm2> ];
      ui:case [ ui:for false; ui:use <#NotAllDayForm2> ].

      <#AllDayForm2>
      a ui:Multiple; ui:min 2; ui:part <#posssibleDate>; ui:property sched:option.
        <#posssibleDate> a ui:DateField; ui:property cal:dtstart; ui:label "date".

      <#NotAllDayForm2>
      a ui:Multiple; ui:min 2; ui:part <#posssibleTime>; ui:property sched:option.
        <#posssibleTime> a ui:DateTimeField; ui:property cal:dtstart; ui:label "date and time".

   ##################################

   <#form3> dc:title "Select invited people"; a ui:Form; ui:parts  ( <#id1118132113135> <#id1417314641301b> ) .
<#id1417314641301b>
   a ui:Multiple; ui:min 1; ui:part <#id1417314674292b>; ui:property sched:invitee.
   <#id1417314674292b> a ui:EmailField; ui:label "email"; ui:property foaf:mbox .
   <#id1118132113135> a ui:Heading; ui:contents "Who to invite" .

# ENDS
`
