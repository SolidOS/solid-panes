module.exports = `
#   Issue tracking - Worksflow application definiion ontology
#
# Finite state automaton ontology
#
# See requirements for tracking tools http://www.w3.org/2005/01/06-tool-req.html
#
@keywords a, is, of.

@prefix :    <http://www.w3.org/2005/01/wf/flow#>.
@prefix wf:    <http://www.w3.org/2005/01/wf/flow#>.

@prefix rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix s: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix owl: <http://www.w3.org/2002/07/owl#>.
@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.

@prefix doc: <http://www.w3.org/2000/10/swap/pim/doc#> .
@prefix log: <http://www.w3.org/2000/10/swap/log#> .
@prefix foaf: <http://xmlns.com/foaf/0.1/>.
@prefix contact: <http://www.w3.org/2000/10/swap/pim/contact#> .
@prefix doap: <http://usefulinc.com/ns/doap#>.
@prefix dc: <http://purl.org/dc/elements/1.1/>.
@prefix dct: <http://purl.org/dc/terms/>.

<> dc:title "Issue Tracking Ontology";

    dct:creator <http://www.w3.org/People/Berners-Lee/card#i>;

    s:comment """This ontology defines a very general class (Task)
    which can used for any kind of bug tracking, issue tracking,
    to-do-list management, action items, goal depednency, and so on.
    It captures the state of a task as a subclass, so that
    subsumption can be used.
    It captures a discussion thread about a task.
    It captures subtasks structure if necessary.
    A "Tracker" defines actual set of states, categories, etc.,
    which  a task can be in. The data about the tracker
    guides the software managing the task.

    There is some workflow modeling finite state machine
    terms which are optional for  more complex definition
    of the transitions allowed.
    """.

Task a s:Class;
    s:label "task"@en; owl:disjointUnionOf (Open Closed);
    s:comment """Something to be done in a wide sense,
    an agenda item at a meeting is one example, but any
    issue, task, action item, goal, product, deliverable, milestone, can such a thing.
    The requirement for this framework was that it would allow
    one to customize ontologies for things such as agenda items,
    action items, working group issues with a spec, w3c Last Call issues,
    software bugs and administrative requests.
    In π-calculus, a process.
    Make your type of issue a subclass of Task.
    """.

Open a s:Class; s:subClassOf Task;
    s:label "open"@en, "ouvert"@fr;
    s:comment """A task which needs attention. The very crude states of Open and Closed all
        interoperatbility between different systems if the states for a given
        application are made subclasses of either Open or Closed. This allows
        tasks from different systems to be mixed and treatd together with
        limited but valuable functionality.
    """.

Closed a s:Class; s:subClassOf Task;
    s:label "closed"@en, "fermé"@fr;
    s:comment """A task which does not neeed attention. It may be closed because
        has been abandonned or completed, for example.
    """.



description a rdf:Property;
        s:label "description";
        s:comment """The description, definition,
        or abstract. Information explaining what this is.
        Not arbitrary comment about anything, only about the subject.
        (Use this property for anything. There is no domain restriction.).""".

dependent a rdf:Property;
        s:label "how";  owl:inverseOf [ s:label "why"];
        s:domain Task; s:range Task;
        s:comment """Another task upon which this depends, in the sense that
        this task cannot be completed without that task being done.
        You can't use this for dependencies on anything other than other tasks.
        (Note the US spelling of the URI. In the UK, a dependant is a something
        which is dependent on somehing else.)""".

assignee    a        rdf:Property;
        s:label        "assigned to"; owl:inverseOf [s:label "assignment"];
#        s:domain    Task;
        s:range        foaf:Agent;
        s:comment    """The person or group to whom this has been assigned.""".

# use dct:modified
#modified        a               rdf:Property;
#                s:label         "last changed".

modifiedBy      a               rdf:Property;
                s:range         foaf:Agent;
                s:label         "changed by".

# use dct:created instead
#created         a               rdf:Property;
#                s:range         xsd:dateTime;
#
# Use foaf:maker instead
#creator         a               rdf:Property;
#                s:range         foaf:Agent;
#                s:label         "changed by".

subscriber      a               rdf:Property;
                s:label         "subscriber";
                s:range         foaf:Agent.


################## Products
#
#
# History:  The Tracker system included a cocept of a product,
# such that an action  could be associated with *either* an issue *or* a product.
# Noah Mendelsohn for the TAG needed to be able make
# and to give products: Goals, scuuess criteria,
#  deliverables with dates, schedules, TAG members assigned, related issues.
#


Product         a s:Class; s:subClassOf Task;
                s:label "product";
                s:comment """A product is a task which monitors something
                which must be produced.""".

deliverable     a rdf:Property; s:subPropertyOf dependent;
                s:range Product;
                s:label "deliverable"@en;
                s:comment """Something which must be deliverered to accomplish this""".


goalDescription a rdf:Property, owl:DatatypeProperty;
                s:domain Task; s:range xsd:string;
                s:label "goals";
                s:comment """A textual description of the goals of this product, etc.""".

successCriteria a rdf:Property, owl:DatatypeProperty;
                s:domain Task; s:range xsd:string;
                s:label "success criteria";
                s:comment """A textual description of the successs critera.
                How when we know this is done?""".

dateDue         a rdf:Property, owl:DatatypeProperty;
                s:domain Task; s:range xsd:date;
                s:label "due"@en;
                s:comment """The date this task is due.
                """.

##################  Attachments

attachment      a rdf:Property;
                s:label "attachment";
                s:comment """Something related is attached for information.""".

screenShot      a rdf:Property; s:subPropertyOf attachment;
                s:label "screen shot"@en;
                s:comment """An image taken by capturing the state of a
                 computer screen, for example to demonstrate a problem""".

testData        a rdf:Property; s:subPropertyOf attachment;
                s:label "test data"@en;
                s:comment """A file which can be used as inpiut to a test
                or to demonstrate a problem. """.


terminalOutput      a rdf:Property; s:subPropertyOf attachment;
                s:label "terminal output"@en;
                s:comment """A file showing user interaction from a
                text terminal or console etc. """.


message         a rdf:Property; s:subPropertyOf attachment;
                s:label "message"@en;
                s:comment """A message about this. Attached for information.""".


Message         a s:Class; s:label "message"@en.
recipent a rdf:Property; s:label "to"; s:domain Message; s:range foaf:Agent.
sender a rdf:Property; s:label "from"; s:domain Message; s:range foaf:Agent.

############################# A Tracker connects and manages issues

tracker         a rdf:Property;
                s:label "tracker";
                owl:inverseOf [ s:label "issue"];
                s:domain Task;
                s:range Tracker.

Tracker         a s:Class;
                s:label "tracker";
                s:comment """A set of issues and
                the constraints on how they evolve.
                To use this ontology, craete a new tracker.
                Copy an existing one or make up your own.""".

issueClass      a rdf:Property;
                s:label "all issues must be in";
                s:domain Tracker;
                s:range s:Class, State;
                s:comment """The class of issues which are allowed in this tracker.
                This is essemtial to the operation of the tracker,
                as it defines which states an issue can be in.
                (The issueClass must be a disjointUnionOf the state classes)""".

issueCategory   a rdf:Property;
                s:label "issue category";
                s:domain Tracker;
                s:range s:Class;
                s:comment """Issues may be categorized according to the
                subclasses of this class""".

stateStore      a rdf:Property;
                s:label "state store";
                s:domain Tracker;
                s:range doc:Document;
                s:comment """A read-write document.
                The state of the issues is modified here.
                When you set up a trcaker, thgis must be set to point
                to a writeble data resource on the web.""".

transactionStore
                a rdf:Property;
                s:label "transaction store";
                s:domain Tracker;
                s:range doc:Document;
                s:comment """An appendable document. Transactions and messsages
                    can be written into here""".

asigneeClass
                a rdf:Property;
                s:label "assignees must be";
                s:domain Tracker;
                s:range s:Class;  # Subclass of foaf:Agent
                s:comment """When an issue is assigned, the assignee must be from this class""".

initialState
                a rdf:Property;
                s:label "initial state"@en;
                s:label "état initial"@fr;
                s:domain Tracker;
                s:range State;
                s:comment """The initial state for a new issue""".

# Use this to link a project to a tracker
doap:bug-database owl:inverseOf [ s:label "project"@en ].




############################################################
#
#           Finite state machines
#
Change        a s:Class;
        s:label "change";
        s:comment """The universal class of things which
change the state of a task.
Included now: Creation, Transition. (Maybe in the future
more π-calculus constructions such as splitting & merging tasks,
and import/export of obligations to a foreign opaque system.)
""".

Transition     a s:Class; s:subClassOf Change;
        s:label        "transition";
        s:comment """A transition is a change of state of
a task. Typical properties include date and/or source
(a document causing the transition), and a final state.""".

Creation     a s:Class; s:subClassOf Change;
        s:label        "creation";
        s:comment """A creation is a change from existence
to non-existence
a task. Typical properties include date and/or source
(a document causing the transition), and a final state.""".


date    s:range    DateTime.

final    a         rdf:Property;
        s:label        "to";
        s:domain    Transition;
        s:range    State.

task        a        rdf:Property;
        s:range        Task;
        s:label        "task".

requires    a rdf:Property;
        s:label "requires";
        s:domain    Transition;
        s:range        rdf:List; # Of properties for validation
        s:comment    """To be a valid transition,
        a necessary (but not necessarily sufficuent) condition
        is that there be recorded these properties for the record""".

affects        a rdf:Property;
        s:label "affects";
        s:domain    doc:Work;
        s:range        Task.


# { ?x a Transition; task ?t; source ?doc } => { ?doc affects ?t }.


creates        a rdf:Property;
        s:label "creates";
        s:domain    doc:Work;
        s:range        Task.


allowedTransitions a rdf:Property;
        s:domain    State;
        s:range        rdf:List; # @@@ of Action
        s:label        "allowed transitions";
        s:comment    """The state machine is defined
    by these lists of transition allowed for each issue.
    (An interesting option in the Web is to make an allowed transition
    to a state in soemone else's ontology, which in turn allows
    transitions into many ontologies.  So a finite state maxchine
    may become very large. In practice this means that a task handed
    off to another organization may be processed on all kinds of ways.)""".

#    { ?x a TerminalState} => { ?x allowedTransitions () }.

final         a rdf:Property;
        s:label        "to";
        s:range    State.

issue        a        rdf:Property;
        s:label        "issue";
        s:comment
        """A transition changes the state of the given issue.""".

source    a        rdf:Property;
        s:label        "source";
        s:comment    """The source of a transition is
                the document by which it happened""";
        s:range        doc:Work.
TerminalState a s:Class;
    s:subClassOf State;
    s:label "terminal state";
    s:comment """A state from which there are no transisions.""".

NonTerminalState a s:Class;
    s:label "non-terminal state";
    owl:disjointWith TerminalState;
    s:comment """A state from which there are transisions.""".

######################################################

#ends
`
