import os
import re
import json
import copy
from functools import wraps
import requests
from flask import (Flask, render_template, request, session, redirect,
                   url_for, abort, jsonify)
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'pcdf_secret_key')
app.config['UPLOAD_FOLDER'] = os.path.join(app.static_folder, 'uploads')
app.config['TEMPLATES_AUTO_RELOAD'] = True
app.jinja_env.auto_reload = True

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(BASE_DIR, 'data', 'content.json')
EVENTS_FILE = os.path.join(BASE_DIR, 'static', 'data', 'events_catalog.json')
os.makedirs(os.path.join(BASE_DIR, 'data'), exist_ok=True)
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

def load_events():
    if os.path.exists(EVENTS_FILE):
        try:
            with open(EVENTS_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            return []
    return []

@app.after_request
def add_cache_headers(response):
    if request.path.startswith('/static/'):
        response.headers['Cache-Control'] = 'public, max-age=604800'
    else:
        if not (os.environ.get('RENDER') or os.environ.get('PRODUCTION')):
            response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate, max-age=0'
            response.headers['Pragma'] = 'no-cache'
            response.headers['Expires'] = '0'
        else:
            response.headers['Cache-Control'] = 'public, max-age=300'
    return response

ADMIN_USER = os.environ.get('ADMIN_USER', 'admin')
ADMIN_PASS = os.environ.get('ADMIN_PASS', 'admin123')

# ---------------------------------------------------------------------------
# CONTENT STORE
# DEFAULTS hold the current site copy. Admin edits override these in content.json
# ---------------------------------------------------------------------------
SECTION_LAYOUTS = ['text', 'cards', 'stats', 'gallery', 'cta', 'two_col']


def new_item():
    return {'heading': 'New item', 'text': '', 'image': '', 'value': '0', 'label': 'Label'}


def new_section(layout):
    s = {'layout': layout, 'title': '', 'subtitle': '', 'text': '',
         'image': '', 'cta_text': 'Learn More', 'cta_link': '/'}
    if layout in ('cards', 'stats', 'gallery'):
        s['items'] = [new_item()]
    else:
        s['items'] = []
    return s


DEFAULTS = {
    'site': {
        'title': 'PCIU Debating Forum',
        'tagline': 'Where logic meets passion, and every argument is a work of art.',
    },
    'home': {
        'hero_kicker': 'Join The Elite Club',
        'hero_title': 'WAR OF WORDS',
        'manifesto_eyebrow': 'The Manifesto',
        'manifesto_title': 'Every argument is a blank canvas.<br class="hidden sm:block" />'
                           '<span class="font-bold">Logic</span> is the structure.<br class="hidden sm:block" />'
                           '<span class="font-bold text-red-600">Passion</span> is the color.',
        'manifesto_text': 'Symposium is not merely a platform for discussion; it is a gallery of human intellect. '
                           'We believe that debates, when stripped of their noise, form stunning geometric patterns '
                           'of thought. Here, words are weapons, and your mind is the ultimate brush. Step into the void '
                           'and leave your mark on the collective consciousness.',
    },
    'about': {
        'eyebrow': 'About PCDF',
        'title': 'The Voice of Reason,<br class="hidden sm:block" /><span class="font-bold">The Power of Words</span>',
        'subtitle': 'The Port City International University Debating Forum (PCIU Debating Forum) is the premier debating society of '
                    'Port City International University. Founded in 2023, we exist to cultivate a culture of critical '
                    'thinking, articulate expression, and respectful discourse on campus — and to send our voices into '
                    'the wider world.',
        'sections': [
            {'layout': 'text', 'title': 'Who We Are', 'subtitle': '',
             'text': 'PCDF is a student-led community of debaters, orators, and critical thinkers. We bring together '
                     'students from every discipline around a single belief: that the disciplined use of language is '
                     'one of the most powerful tools a person can wield.',
             'image': '', 'items': []},
            {'layout': 'stats', 'title': 'By the Numbers', 'subtitle': '', 'text': '', 'image': '',
             'items': [{'heading': '', 'text': '', 'image': '', 'value': '320', 'label': 'Active Members'},
                       {'heading': '', 'text': '', 'image': '', 'value': '48', 'label': 'Tournaments / Yr'},
                       {'heading': '', 'text': '', 'image': '', 'value': '17', 'label': 'Trophies Won'},
                       {'heading': '', 'text': '', 'image': '', 'value': '2023', 'label': 'Founded'}]},
            {'layout': 'cards', 'title': 'What We Do', 'subtitle': 'Programmes', 'text': '', 'image': '',
             'items': [
                 {'heading': 'Weekly Drill Sessions', 'text': 'Hands-on practice of framing, rebuttal, and delivery every week of the semester.', 'image': '', 'value': '', 'label': ''},
                 {'heading': 'Masterclasses', 'text': 'Guest adjudicators and champions teach style, strategy, and world-class technique.', 'image': '', 'value': '', 'label': ''},
                 {'heading': 'Internal Leagues', 'text': 'Term-long leagues with rankings, finals, and prizes to keep members sharp.', 'image': '', 'value': '', 'label': ''},
                 {'heading': 'External Tournaments', 'text': 'Representation at national and international BP, AP, and WSDC competitions.', 'image': '', 'value': '', 'label': ''},
                 {'heading': 'Adjudication Training', 'text': 'A structured path from speaker to certified judge and tournament official.', 'image': '', 'value': '', 'label': ''},
                 {'heading': 'Outreach & Schools', 'text': 'Workshops in local schools to grow the culture of debate beyond campus.', 'image': '', 'value': '', 'label': ''}]},
            {'layout': 'cta', 'title': 'Join the Forum', 'subtitle': '',
             'text': 'Whether you have never spoken in public or you already compete nationally, there is a place for you at PCDF.',
             'image': '', 'cta_text': 'Apply Now', 'cta_link': '/apply', 'items': []},
        ],
    },
    'manifesto': {
        'eyebrow': 'Our Manifesto',
        'title': 'WE BELIEVE IN THE <span class="text-red-600">SACRED POWER</span> OF THE WELL-PLACED WORD.',
        'subtitle': '',
        'sections': [
            {'layout': 'text', 'title': '', 'subtitle': '',
             'text': 'Debate is not about winning. It is about thinking clearly when it is hard, speaking bravely when '
                     'it is unpopular, and listening deeply when it is uncomfortable.',
             'image': '', 'items': []},
            {'layout': 'cards', 'title': 'Principles', 'subtitle': 'What We Stand For', 'text': '', 'image': '',
             'items': [
                 {'heading': 'Logic Over Loudness', 'text': 'The strongest voice is the one with the soundest reasoning.', 'image': '', 'value': '', 'label': ''},
                 {'heading': 'Evidence Over Echo', 'text': 'Claims earn their place only when backed by facts.', 'image': '', 'value': '', 'label': ''},
                 {'heading': 'Respect Over Ridicule', 'text': 'We attack ideas vigorously and opponents never.', 'image': '', 'value': '', 'label': ''},
                 {'heading': 'Question Over Certainty', 'text': 'The best debaters hold their conclusions loosely.', 'image': '', 'value': '', 'label': ''},
                 {'heading': 'Courage Over Comfort', 'text': 'We speak the unpopular truth when the moment demands it.', 'image': '', 'value': '', 'label': ''},
                 {'heading': 'Service Over Status', 'text': 'We use our voices to inform, include, and lift others.', 'image': '', 'value': '', 'label': ''}]},
            {'layout': 'cta', 'title': 'Enter the Forum', 'subtitle': '',
             'text': '', 'image': '', 'cta_text': 'About PCDF', 'cta_link': '/about', 'items': []},
        ],
    },
    'committee': {
        'eyebrow': 'Leadership',
        'title': 'The <span class="font-bold">Executive Committee</span>',
        'subtitle': 'PCDF is run by a dedicated student committee elected each session. Meet the 17 executives who set the '
                    'vision, run the training, and carry the forum forward.',
        'sections': [
            {'layout': 'text', 'title': 'How We Work', 'subtitle': '',
             'text': 'The committee is elected annually by the membership. We split into portfolios so training, '
                     'tournaments, outreach, and communications all get the focus they deserve.',
             'image': '', 'items': []},
            {'layout': 'cards', 'title': 'Executive Committee', 'subtitle': 'Meet the Team', 'text': '', 'image': '',
             'items': [
                 {'heading': 'President', 'text': 'Asabul Islam Rutul — sets the strategic vision and represents PCDF externally.', 'image': '/static/img/committee_members/asabul_islam_rutul.webp', 'value': '', 'label': ''},
                 {'heading': 'Vice President', 'text': 'Muhammad Ibrahim — oversees competitive training and tournament preparation.', 'image': '/static/img/committee_members/muhammad_ibrahim.webp', 'value': '', 'label': ''},
                 {'heading': 'Joint Secretary', 'text': 'Umme Kulsum — leads organisational management and administrative coordination.', 'image': '/static/img/committee_members/umme_kulsum.webp', 'value': '', 'label': ''},
                 {'heading': 'Debate Secretary', 'text': 'Jahedul Islam Rafi — manages debate modules, motions, and competitive workshops.', 'image': '/static/img/committee_members/jahedul_islam_rafi.webp', 'value': '', 'label': ''},
                 {'heading': 'Finance Secretary', 'text': 'Fahmida Rubaiyat Nazifa — manages forum budget, sponsorship, and fiscal planning.', 'image': '/static/img/committee_members/fahmida_rubaiyat_nazifa.webp', 'value': '', 'label': ''},
                 {'heading': 'Press & Media Secretary', 'text': 'Taqi Mahmud Chowdhury — heads public relations, branding, and media communications.', 'image': '/static/img/committee_members/taqi_mahmud_chowdhury.webp', 'value': '', 'label': ''}]},
            {'layout': 'cta', 'title': 'Get Involved', 'subtitle': '',
             'text': 'Connect with the leadership team or join the forum as a competitive debater.', 'image': '', 'cta_text': 'Contact Us', 'cta_link': '/contact', 'items': []},
        ],
    },
    'events': {
        'eyebrow': 'Activities & Events',
        'title': 'Where We <span class="font-bold">Clash</span>',
        'subtitle': "From weekly drills to national championships, PCDF's calendar is packed with opportunities to "
                    'speak, judge, and grow. Here is what we run through the year.',
        'sections': [
            {'layout': 'text', 'title': 'Our Calendar', 'subtitle': '',
             'text': 'We train every week and compete almost every month. Members can jump into as much or as little '
                     'as they like.',
             'image': '', 'items': []},
            {'layout': 'cards', 'title': 'Formats We Compete In', 'subtitle': '', 'text': '', 'image': '',
             'items': [
                 {'heading': 'British Parliamentary', 'text': 'The international standard; fast, witty, and strategic.', 'image': '', 'value': '', 'label': ''},
                 {'heading': 'Asian Parliamentary', 'text': 'Sharp rhetoric and points of information.', 'image': '', 'value': '', 'label': ''},
                 {'heading': 'World Schools', 'text': 'Team-based, prepared and impromptu motions.', 'image': '', 'value': '', 'label': ''},
                 {'heading': 'Public Speaking', 'text': 'Platform speaking and oratory for every occasion.', 'image': '', 'value': '', 'label': ''}]},
            {'layout': 'cards', 'title': 'Flagship Events', 'subtitle': '', 'text': '', 'image': '',
             'items': [
                 {'heading': 'PCDF Nationals', 'text': 'Our biggest tournament of the year.', 'image': '', 'value': '', 'label': ''},
                 {'heading': 'Inter-University Championship', 'text': 'We host teams from across the country.', 'image': '', 'value': '', 'label': ''},
                 {'heading': 'Freshman Cup', 'text': 'A friendly launchpad for first-year debaters.', 'image': '', 'value': '', 'label': ''},
                 {'heading': 'Workshop Series', 'text': 'Skills clinics with champions and adjudicators.', 'image': '', 'value': '', 'label': ''}]},
            {'layout': 'cta', 'title': 'See You on the Floor', 'subtitle': '',
             'text': '', 'image': '', 'cta_text': 'Apply', 'cta_link': '/apply', 'items': []},
        ],
    },
    'achievements': {
        'eyebrow': 'Achievements',
        'title': 'The <span class="font-bold">Trophy Case</span>',
        'subtitle': "PCDF members don't just train — they win. A record of championships, breaks, and best-speaker "
                    'titles from tournaments across the country and beyond.',
        'sections': [
            {'layout': 'stats', 'title': 'The Record', 'subtitle': 'By the Numbers', 'text': '', 'image': '',
             'items': [{'heading': '', 'text': '', 'image': '', 'value': '60+', 'label': 'Tournaments'},
                       {'heading': '', 'text': '', 'image': '', 'value': '25', 'label': 'Trophies'},
                       {'heading': '', 'text': '', 'image': '', 'value': '40', 'label': 'Best Speakers'},
                       {'heading': '', 'text': '', 'image': '', 'value': '12', 'label': 'Finals'}]},
            {'layout': 'cards', 'title': 'Trophy Case', 'subtitle': 'Recent Highlights', 'text': '', 'image': '',
             'items': [
                 {'heading': 'National BP Open Champions', 'text': 'Undefeated in prelims, won a 3–2 final.', 'image': '', 'value': '', 'label': ''},
                 {'heading': 'Best Speaker Award', 'text': 'Sarah Khan ranked top speaker nationally.', 'image': '', 'value': '', 'label': ''},
                 {'heading': 'Novice Cup Winners', 'text': 'Our first-year team took the title.', 'image': '', 'value': '', 'label': ''},
                 {'heading': 'Outreach Excellence', 'text': 'Recognised for school debate programmes.', 'image': '', 'value': '', 'label': ''}]},
            {'layout': 'cards', 'title': 'Milestones', 'subtitle': '', 'text': '', 'image': '',
             'items': [
                 {'heading': '2023', 'text': 'PCDF founded at PCIU.', 'image': '', 'value': '', 'label': ''},
                 {'heading': '2024', 'text': 'First national break.', 'image': '', 'value': '', 'label': ''},
                 {'heading': '2025', 'text': 'Hosted the PCDF Nationals.', 'image': '', 'value': '', 'label': ''},
                 {'heading': '2026', 'text': 'Crossed 60 tournaments competed.', 'image': '', 'value': '', 'label': ''}]},
        ],
    },
    'news': {
        'eyebrow': 'News & Notices',
        'title': 'The Latest from <span class="font-bold">PCDF</span>',
        'subtitle': 'Bulletins, deadlines, results, and opportunities — everything members and the community need to '
                    'stay in the loop.',
        'sections': [
            {'layout': 'cards', 'title': 'Notices & Results', 'subtitle': 'Latest', 'text': '', 'image': '',
             'items': [
                 {'heading': 'Tryouts for 2026–27 Are Open', 'text': 'Auditions run across two weekends in September. Register before Sept 10.', 'image': '', 'value': '', 'label': ''},
                 {'heading': 'PCDF A Champions at Regional BP Open', 'text': 'Our senior team went undefeated in prelims.', 'image': '', 'value': '', 'label': ''},
                 {'heading': 'Weekly Drills Move to Room 204', 'text': 'From August, Tuesday drills shift to the forum room.', 'image': '', 'value': '', 'label': ''},
                 {'heading': 'Call for Adjudicators', 'text': 'Alumni can apply to judge at the November Nationals.', 'image': '', 'value': '', 'label': ''},
                 {'heading': 'School Outreach Launches', 'text': 'Weekly debate clubs at three partner schools.', 'image': '', 'value': '', 'label': ''},
                 {'heading': 'Motion Bank Vol. III', 'text': '300+ new motions added to the library.', 'image': '', 'value': '', 'label': ''}]},
            {'layout': 'cta', 'title': 'Never Miss a Beat', 'subtitle': '',
             'text': 'Subscribe to the newsletter for results, deadlines, and the occasional provocation.',
             'image': '', 'cta_text': 'Subscribe', 'cta_link': '/newsletter', 'items': []},
        ],
    },
    'reports': {
        'eyebrow': 'Knowledge Base',
        'title': 'Reports & <span class="font-bold">Publications</span>',
        'subtitle': 'PCDF believes knowledge should be shared. Our resource library collects annual reports, motion '
                    'banks, research, and guides for the wider debate community.',
        'sections': [
            {'layout': 'cards', 'title': 'Publications', 'subtitle': 'Knowledge Base', 'text': '', 'image': '',
             'items': [
                 {'heading': 'Annual Report 2025', 'text': 'Our year in review: impact, finance, and plans.', 'image': '', 'value': '', 'label': ''},
                 {'heading': 'Motion Bank Vol. III', 'text': '300+ tournament-ready motions with infoslides.', 'image': '', 'value': '', 'label': ''},
                 {'heading': 'Debate Handbook', 'text': 'A guide to BP, AP, and WSDC for beginners.', 'image': '', 'value': '', 'label': ''},
                 {'heading': 'Research Briefs', 'text': 'Short briefings on recurring debate topics.', 'image': '', 'value': '', 'label': ''},
                 {'heading': 'Tournament Guide', 'text': 'How we plan and run PCDF events.', 'image': '', 'value': '', 'label': ''},
                 {'heading': 'Policy Papers', 'text': 'Our positions on debate and education policy.', 'image': '', 'value': '', 'label': ''}]},
            {'layout': 'cta', 'title': 'Need a Resource?', 'subtitle': '',
             'text': '', 'image': '', 'cta_text': 'Contact', 'cta_link': '/contact', 'items': []},
        ],
    },
    'gallery': {
        'eyebrow': 'Gallery',
        'title': 'Moments from <span class="font-bold">the Floor</span>',
        'subtitle': 'Every tournament, workshop, and gala leaves a trail of spontaneity, intensity, and camaraderie. '
                    'A visual diary of the PCIU Debating Forum.',
        'sections': [
            {'layout': 'gallery', 'title': 'From the Floor', 'subtitle': 'Moments', 'text': '', 'image': '',
             'items': [
                 {'heading': 'Tournament Finals', 'text': '', 'image': '', 'value': '', 'label': ''},
                 {'heading': 'Workshop', 'text': '', 'image': '', 'value': '', 'label': ''},
                 {'heading': 'Gala Night', 'text': '', 'image': '', 'value': '', 'label': ''},
                 {'heading': 'Training Camp', 'text': '', 'image': '', 'value': '', 'label': ''},
                 {'heading': 'Outreach', 'text': '', 'image': '', 'value': '', 'label': ''},
                 {'heading': 'Trophy Ceremony', 'text': '', 'image': '', 'value': '', 'label': ''}]},
            {'layout': 'cta', 'title': 'More Soon', 'subtitle': '',
              'text': '', 'image': '', 'cta_text': 'Home', 'cta_link': '/', 'items': []},
        ],
    },
    'contact': {
        'eyebrow': 'Contact',
        'title': 'Let&#39;s <span class="font-bold">Talk</span>',
        'subtitle': 'Questions about joining, partnering, or sponsoring PCDF? We&#39;d love to hear from you. Reach '
                    'the committee directly or drop by the forum room.',
        'sections': [
            {'layout': 'text', 'title': 'Reach Us', 'subtitle': '',
             'text': 'The fastest way to reach the committee is email, but you are always welcome to drop by the forum '
                     'room during our open hours.',
             'image': '', 'items': []},
            {'layout': 'cards', 'title': 'Details', 'subtitle': '', 'text': '', 'image': '',
             'items': [
                 {'heading': 'Email', 'text': 'debate@pciu.edu', 'image': '', 'value': '', 'label': ''},
                 {'heading': 'Phone', 'text': '+880 1234 567890', 'image': '', 'value': '', 'label': ''},
                 {'heading': 'Room', 'text': 'Student Union, Room 204', 'image': '', 'value': '', 'label': ''},
                 {'heading': 'Hours', 'text': 'Mon–Fri · 3–7 PM', 'image': '', 'value': '', 'label': ''}]},
            {'layout': 'cta', 'title': 'Send a Message', 'subtitle': '',
             'text': 'Use the form and we will get back to you within two working days.',
             'image': '', 'cta_text': 'Email Us', 'cta_link': 'mailto:debate@pciu.edu', 'items': []},
        ],
    },
    'testimonials': {
        'eyebrow': 'Voices',
        'title': 'In Their <span class="font-bold">Words</span>',
        'subtitle': 'Members, alumni, and partners on what the PCIU Debating Forum gave them — and what it asks of '
                    'anyone who joins.',
        'sections': [
            {'layout': 'cards', 'title': 'Voices', 'subtitle': 'In Their Words', 'text': '', 'image': '',
             'items': [
                 {'heading': 'Aarav Rahman · President', 'text': 'PCDF turned my fear of public speaking into my favourite weapon.', 'image': '', 'value': '', 'label': ''},
                 {'heading': 'Sarah Khan · Vice President', 'text': 'The discipline of rebuilding my argument under fire is the most useful skill I learned.', 'image': '', 'value': '', 'label': ''},
                 {'heading': 'Imran Hossain · Alumnus', 'text': 'I watch our members out-think people with twice their experience. That is the training paying off.', 'image': '', 'value': '', 'label': ''},
                 {'heading': 'Nafisa Faruque · Treasurer', 'text': 'I joined for the debates and stayed for the people.', 'image': '', 'value': '', 'label': ''},
                 {'heading': 'Mehdi Hasan · Secretary General', 'text': 'Our school outreach kids now run their own debates. That ripple effect is why I volunteer.', 'image': '', 'value': '', 'label': ''},
                 {'heading': 'Partner · BRAC Bank', 'text': 'Sponsoring PCDF was an easy yes. We get sharp, thoughtful young people.', 'image': '', 'value': '', 'label': ''}]},
        ],
    },
    'partners': {
        'eyebrow': 'Allies',
        'title': 'Our <span class="font-bold">Partners</span>',
        'subtitle': 'PCDF is sustained by universities, institutions, and brands who believe in the power of reasoned '
                    'speech. Thank you to everyone who helps us debate freely.',
        'sections': [
            {'layout': 'cards', 'title': 'Our Partners', 'subtitle': 'Allies', 'text': '', 'image': '',
             'items': [
                 {'heading': 'BRAC Bank', 'text': 'Title sponsor of the PCDF Nationals.', 'image': '', 'value': '', 'label': ''},
                 {'heading': 'The Daily Star', 'text': 'Media partner for tournament coverage.', 'image': '', 'value': '', 'label': ''},
                 {'heading': 'British Council', 'text': 'Supports our training and workshops.', 'image': '', 'value': '', 'label': ''},
                 {'heading': 'UNICEF', 'text': 'Partner on youth dialogue programmes.', 'image': '', 'value': '', 'label': ''},
                 {'heading': 'Grameenphone', 'text': 'Connectivity and outreach support.', 'image': '', 'value': '', 'label': ''},
                 {'heading': 'Pathao', 'text': 'Mobility partner for events.', 'image': '', 'value': '', 'label': ''}]},
            {'layout': 'cards', 'title': 'Become a Partner', 'subtitle': 'Collaborate', 'text': '', 'image': '',
             'items': [
                 {'heading': 'Sponsor a Tournament', 'text': 'Put your brand behind the next generation of thinkers.', 'image': '', 'value': '', 'label': ''},
                 {'heading': 'Host a Masterclass', 'text': 'Share expertise via guest sessions.', 'image': '', 'value': '', 'label': ''},
                 {'heading': 'Fund Outreach', 'text': 'Keep debate free and open to all.', 'image': '', 'value': '', 'label': ''}]},
            {'layout': 'cta', 'title': 'Talk to Us', 'subtitle': '',
              'text': '', 'image': '', 'cta_text': 'Contact', 'cta_link': '/contact', 'items': []},
        ],
    },
    'newsletter': {
        'eyebrow': 'Newsletter',
        'title': 'Stay in the <span class="font-bold">Loop</span>',
        'subtitle': 'No spam. Just tournament alerts, workshop drops, and the occasional philosophical provocation — '
                    'straight to your inbox.',
        'sections': [
            {'layout': 'cta', 'title': 'Stay in the Loop', 'subtitle': '',
             'text': 'No spam. Just tournament alerts, workshop drops, and the occasional philosophical provocation.',
             'image': '', 'cta_text': 'Subscribe', 'cta_link': '#', 'items': []},
            {'layout': 'cards', 'title': 'What You’ll Get', 'subtitle': '', 'text': '', 'image': '',
             'items': [
                 {'heading': 'Results & Breaks', 'text': 'Same-day summaries of every PCDF tournament.', 'image': '', 'value': '', 'label': ''},
                 {'heading': 'Workshop Drops', 'text': 'Early access to masterclasses and tryouts.', 'image': '', 'value': '', 'label': ''},
                 {'heading': 'The Long Form', 'text': 'Occasional essays on rhetoric and reason.', 'image': '', 'value': '', 'label': ''}]},
        ],
    },
    'apply': {
        'eyebrow': 'Join the Forum',
        'title': 'Become a <span class="font-bold">Member</span>',
        'subtitle': 'We recruit twice a year — spring and fall. No prior debate experience required. What we look for: '
                    'intellectual curiosity, a willingness to be challenged, and the courage to challenge others.',
        'sections': [
            {'layout': 'cards', 'title': 'The Process', 'subtitle': 'How to Join', 'text': '', 'image': '',
             'items': [
                 {'heading': 'Submit Application', 'text': 'Fill out the online form and tell us why you want to join.', 'image': '', 'value': '', 'label': ''},
                 {'heading': 'Audition Round', 'text': 'A friendly 10-minute debate with senior members.', 'image': '', 'value': '', 'label': ''},
                 {'heading': 'Welcome to PCDF', 'text': 'A 4-week induction with training and mentorship.', 'image': '', 'value': '', 'label': ''}]},
            {'layout': 'text', 'title': 'Who Can Apply', 'subtitle': '',
             'text': 'Any Port City International University student, undergraduate or postgraduate. No debate '
                     'background needed — we train complete beginners.',
             'image': '', 'items': []},
            {'layout': 'cta', 'title': 'Start Application', 'subtitle': '',
             'text': 'Next recruitment cycle opens September 2026.',
             'image': '', 'cta_text': 'Apply Now', 'cta_link': '/contact', 'items': []},
        ],
    },
    'timeline': {
        'eyebrow': 'Timeline',
        'title': 'Our <span class="font-bold">Journey</span>',
        'subtitle': 'The story of PCDF so far — year by year.',
        'sections': [
            {'layout': 'text', 'title': 'From Idea to Institution', 'subtitle': '',
             'text': 'What started as a group of friends arguing in a cafeteria is now the premier debating society '
                     'of the university.',
             'image': '', 'items': []},
        ],
    },
    'blog': {
        'eyebrow': 'Insights & Thought Leadership',
        'title': 'The Orator&#39;s <span class="font-bold">Journal</span>',
        'subtitle': 'Debating strategies, motion breakdowns, speaker techniques, and philosophical inquiries from PCIU Debating Forum members and adjudicators.',
        'sections': [
            {'layout': 'cards', 'title': 'Featured Articles', 'subtitle': 'Deep Dives & Strategy', 'text': '', 'image': '',
             'items': [
                 {'heading': 'Mastering British Parliamentary: The Opening Half Breakdown', 'text': 'How Opening Government and Opening Opposition set the clash and frame the debate for victory.', 'image': '', 'value': 'Strategy', 'label': '10 Min Read'},
                 {'heading': 'The Art of Characterization in Policy Motions', 'text': 'Why stakeholders and tangible incentives matter more than abstract philosophical assertions.', 'image': '', 'value': 'Adjudication', 'label': '7 Min Read'},
                 {'heading': 'Rebuttal Under Fire: Deconstructing 3-Minute Extensions', 'text': 'Techniques from world-class closing speakers on extracting winning metrics in closing half.', 'image': '', 'value': 'Technique', 'label': '8 Min Read'},
                 {'heading': 'Economics for Debaters: Inflation, Fiscal Levers, and Market Failures', 'text': 'A comprehensive primer on breaking down international trade, sanction, and monetary policy debates.', 'image': '', 'value': 'Mastery', 'label': '12 Min Read'},
                 {'heading': 'Speech Modulation & Rhetorical Impact: The Psychology of Persuasion', 'text': 'How tempo, pause, and strategic emphasis elevate logical argumentation into unforgettable speeches.', 'image': '', 'value': 'Oratory', 'label': '6 Min Read'},
                 {'heading': 'Constructing Unbreakable Comparative Frameworks', 'text': 'How to decisively prove why your world is preferable, even under the worst assumptions.', 'image': '', 'value': 'Logic', 'label': '9 Min Read'},
             ]},
            {'layout': 'cta', 'title': 'Contribute to the Journal', 'subtitle': 'Call for Submissions',
             'text': 'Are you a debater, alumnus, or adjudicator with an essay or motion analysis to share? We welcome submissions.',
             'image': '', 'cta_text': 'Submit an Article', 'cta_link': '/contact', 'items': []},
        ],
    },
}


def load_content():
    if not os.path.exists(DATA_FILE):
        save_content(DEFAULTS)
        return json.loads(json.dumps(DEFAULTS))
    try:
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return json.loads(json.dumps(DEFAULTS))


def save_content(data):
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


CONTENT = load_content()


def content(page, key, default=''):
    return CONTENT.get(page, {}).get(key, DEFAULTS.get(page, {}).get(key, default))


app.jinja_env.globals['content'] = content


def content_sections(page):
    return CONTENT.get(page, {}).get('sections', DEFAULTS.get(page, {}).get('sections', []))


app.jinja_env.globals['content_sections'] = content_sections


def hero_fields():
    return [
        {'key': 'eyebrow', 'label': 'Eyebrow Label', 'type': 'text'},
        {'key': 'title', 'label': 'Page Title (HTML allowed)', 'type': 'textarea'},
        {'key': 'subtitle', 'label': 'Subtitle / Description', 'type': 'textarea'},
        {'key': 'image', 'label': 'Hero Image', 'type': 'image'},
    ]


PAGE_FIELDS = {
    'site': [
        {'key': 'title', 'label': 'Site Title', 'type': 'text'},
        {'key': 'tagline', 'label': 'Tagline', 'type': 'text'},
    ],
    'home': [
        {'key': 'hero_kicker', 'label': 'Hero Kicker', 'type': 'text'},
        {'key': 'hero_title', 'label': 'Hero Title', 'type': 'text'},
        {'key': 'manifesto_eyebrow', 'label': 'Manifesto Eyebrow', 'type': 'text'},
        {'key': 'manifesto_title', 'label': 'Manifesto Title (HTML allowed)', 'type': 'textarea'},
        {'key': 'manifesto_text', 'label': 'Manifesto Paragraph', 'type': 'textarea'},
    ],
    'about': hero_fields(),
    'manifesto': hero_fields(),
    'committee': hero_fields(),
    'events': hero_fields(),
    'achievements': hero_fields(),
    'news': hero_fields(),
    'reports': hero_fields(),
    'gallery': hero_fields(),
    'contact': hero_fields(),
    'testimonials': hero_fields(),
    'partners': hero_fields(),
    'newsletter': hero_fields(),
    'apply': hero_fields(),
    'timeline': hero_fields(),
    'blog': hero_fields(),
}

PAGE_LABELS = {
    'site': 'Site-wide',
    'home': 'Home',
    'about': 'About',
    'manifesto': 'Manifesto',
    'committee': 'Committee',
    'events': 'Events',
    'achievements': 'Achievements',
    'news': 'News & Notices',
    'reports': 'Reports',
    'gallery': 'Gallery',
    'contact': 'Contact',
    'testimonials': 'Voices',
    'partners': 'Partners',
    'newsletter': 'Newsletter',
    'apply': 'Apply',
    'timeline': 'Timeline',
    'blog': 'Blog',
}


@app.context_processor
def inject_globals():
    def content(page, key, default=''):
        return CONTENT.get(page, {}).get(key, DEFAULTS.get(page, {}).get(key, default))

    def content_sections(page):
        return CONTENT.get(page, {}).get('sections', DEFAULTS.get(page, {}).get('sections', []))
    PATH_MAP = {
        '/': 'home', '/about': 'about', '/manifesto': 'manifesto',
        '/committee': 'committee', '/events': 'events', '/achievements': 'achievements',
        '/news': 'news', '/reports': 'reports', '/gallery': 'gallery',
        '/contact': 'contact', '/testimonials': 'testimonials', '/partners': 'partners',
        '/newsletter': 'newsletter', '/apply': 'apply', '/timeline': 'timeline',
        '/blog': 'blog',
    }
    return {
        'is_admin': session.get('admin', False),
        'edit_mode': session.get('admin', False) and request.args.get('edit') == '1',
        'admin_page': PATH_MAP.get(request.path),
        'content': content,
        'content_sections': content_sections,
        'events_catalog': load_events(),
        'site_title': CONTENT.get('site', {}).get('title', DEFAULTS['site']['title']),
        'site_tagline': CONTENT.get('site', {}).get('tagline', DEFAULTS['site']['tagline']),
        'PAGE_LABELS': PAGE_LABELS,
        'SECTION_LAYOUTS': SECTION_LAYOUTS,
    }


# ---------------------------------------------------------------------------
# PUBLIC ROUTES
# ---------------------------------------------------------------------------
@app.route('/')
def index():
    return render_template('index.html', events=load_events())


@app.route('/about')
def about():
    return render_template('about.html')


@app.route('/manifesto')
def manifesto():
    return render_template('manifesto.html')


@app.route('/committee')
def committee():
    return render_template('committee.html')


@app.route('/events')
def events():
    return render_template('events.html', events=load_events())


@app.route('/achievements')
def achievements():
    return render_template('achievements.html')


@app.route('/news')
def news():
    return render_template('news.html')


@app.route('/reports')
def reports():
    return render_template('reports.html')


@app.route('/blog')
def blog():
    return render_template('blog.html')


@app.route('/gallery')
def gallery():
    return render_template('gallery.html', events=load_events())


@app.route('/contact')
def contact():
    return render_template('contact.html')


@app.route('/testimonials')
def testimonials():
    return render_template('testimonials.html')


@app.route('/partners')
def partners():
    return render_template('partners.html')


@app.route('/newsletter')
def newsletter():
    return render_template('newsletter.html')


@app.route('/apply')
def apply():
    return render_template('apply.html')


@app.route('/timeline')
def timeline():
    return render_template('timeline.html', events=load_events())


# ---------------------------------------------------------------------------
# ADMIN AUTH
# ---------------------------------------------------------------------------
def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get('admin'):
            return redirect(url_for('admin_login'))
        return f(*args, **kwargs)
    return decorated


@app.route('/admin/login', methods=['GET', 'POST'])
def admin_login():
    if request.method == 'POST':
        if (request.form.get('username') == ADMIN_USER and
                request.form.get('password') == ADMIN_PASS):
            session['admin'] = True
            return redirect(url_for('admin_dashboard'))
        return render_template('admin/login.html', error='Invalid username or password.')
    return render_template('admin/login.html', error=None)


@app.route('/admin/logout')
def admin_logout():
    session.pop('admin', None)
    return redirect(url_for('admin_login'))


@app.route('/admin')
@login_required
def admin_dashboard():
    return render_template('admin/dashboard.html', pages=PAGE_FIELDS, labels=PAGE_LABELS)


def parse_sections(form, files):
    sections = []
    sec_idx = set()
    for k in form.keys():
        m = re.match(r's(\d+)_title$', k)
        if m:
            sec_idx.add(int(m.group(1)))
    for i in sorted(sec_idx):
        sec = {
            'layout': form.get('s%d_layout' % i, 'text'),
            'title': form.get('s%d_title' % i, ''),
            'subtitle': form.get('s%d_subtitle' % i, ''),
            'text': form.get('s%d_text' % i, ''),
            'image': form.get('_cur_s%d_image' % i, ''),
            'cta_text': form.get('s%d_cta_text' % i, ''),
            'cta_link': form.get('s%d_cta_link' % i, ''),
            'items': [],
        }
        f = files.get('s%d_image' % i)
        if f and f.filename:
            fn = secure_filename(f.filename)
            if fn:
                f.save(os.path.join(app.config['UPLOAD_FOLDER'], fn))
                sec['image'] = url_for('static', filename='uploads/' + fn)
        elif form.get('_rm_s%d_image' % i):
            sec['image'] = ''
        item_idx = set()
        for k in form.keys():
            m = re.match(r's%d_it(\d+)_heading$' % i, k)
            if m:
                item_idx.add(int(m.group(1)))
        for j in sorted(item_idx):
            it = {
                'heading': form.get('s%d_it%d_heading' % (i, j), ''),
                'text': form.get('s%d_it%d_text' % (i, j), ''),
                'image': form.get('_cur_s%d_it%d_image' % (i, j), ''),
                'value': form.get('s%d_it%d_value' % (i, j), ''),
                'label': form.get('s%d_it%d_label' % (i, j), ''),
            }
            fi = files.get('s%d_it%d_image' % (i, j))
            if fi and fi.filename:
                fn = secure_filename(fi.filename)
                if fn:
                    fi.save(os.path.join(app.config['UPLOAD_FOLDER'], fn))
                    it['image'] = url_for('static', filename='uploads/' + fn)
            elif form.get('_rm_s%d_it%d_image' % (i, j)):
                it['image'] = ''
            sec['items'].append(it)
        sections.append(sec)
    return sections


def set_nested(d, path, value):
    """Set a value inside a nested dict/list using a dotted path
    e.g. 'sections.2.items.1.heading'."""
    keys = path.split('.')
    cur = d
    for k in keys[:-1]:
        cur = cur[int(k)] if str(k).isdigit() else cur[k]
    last = keys[-1]
    cur[int(last) if str(last).isdigit() else last] = value


def apply_section_action(sections, action):
    parts = action.split(':')
    if parts[0] == 'add_section' and len(parts) == 2:
        sections.append(new_section(parts[1]))
    elif parts[0] == 'add_section_at' and len(parts) == 3:
        sections.insert(int(parts[2]), new_section(parts[1]))
    elif parts[0] == 'del_section':
        i = int(parts[1])
        if 0 <= i < len(sections):
            del sections[i]
    elif parts[0] == 'move':
        i, d = int(parts[1]), parts[2]
        if d == 'up' and i > 0:
            sections[i - 1], sections[i] = sections[i], sections[i - 1]
        elif d == 'down' and i < len(sections) - 1:
            sections[i + 1], sections[i] = sections[i], sections[i + 1]
    elif parts[0] == 'add_item':
        i = int(parts[1])
        if 0 <= i < len(sections):
            sections[i].setdefault('items', []).append(new_item())
    elif parts[0] == 'del_item':
        i, j = int(parts[1]), int(parts[2])
        if 0 <= i < len(sections) and 0 <= j < len(sections[i].get('items', [])):
            del sections[i]['items'][j]
    return sections


@app.route('/admin/edit/<page>', methods=['GET', 'POST'])
@login_required
def admin_edit(page):
    if page not in PAGE_FIELDS:
        abort(404)
    if request.method == 'POST':
        action = request.form.get('_action', '')
        base = copy.deepcopy(DEFAULTS.get(page, {}))
        base.update(CONTENT.get(page, {}))
        # hero fields
        for field in PAGE_FIELDS[page]:
            key = field['key']
            if field['type'] == 'image':
                f = request.files.get(key)
                if f and f.filename:
                    fn = secure_filename(f.filename)
                    if fn:
                        f.save(os.path.join(app.config['UPLOAD_FOLDER'], fn))
                        base[key] = url_for('static', filename='uploads/' + fn)
                elif request.form.get('_remove_' + key):
                    base.pop(key, None)
            else:
                base[key] = request.form.get(key, '')
        # sections
        sections = parse_sections(request.form, request.files)
        base['sections'] = sections
        CONTENT[page] = base
        save_content(CONTENT)
        if action:
            sections = apply_section_action(sections, action)
            base['sections'] = sections
            CONTENT[page] = base
            save_content(CONTENT)
            return render_template('admin/edit.html', page=page, fields=PAGE_FIELDS[page],
                                   values=base, label=PAGE_LABELS.get(page, page), saved=False)
        return redirect(url_for('admin_edit', page=page, saved=1))
    vals = copy.deepcopy(DEFAULTS.get(page, {}))
    vals.update(CONTENT.get(page, {}))
    return render_template('admin/edit.html', page=page, fields=PAGE_FIELDS[page],
                           values=vals, label=PAGE_LABELS.get(page, page),
                           saved=request.args.get('saved') == '1')


def _load_page_base(page):
    base = copy.deepcopy(DEFAULTS.get(page, {}))
    base.update(CONTENT.get(page, {}))
    CONTENT[page] = base
    return base


@app.route('/admin/api/set/<page>', methods=['POST'])
@login_required
def admin_api_set(page):
    if page not in PAGE_FIELDS:
        abort(404)
    data = request.get_json(silent=True) or {}
    path = data.get('path', '')
    value = data.get('value', '')
    if not path:
        return jsonify({'ok': False, 'error': 'no path'}), 400
    base = _load_page_base(page)
    try:
        set_nested(base, path, value)
    except (KeyError, IndexError, TypeError):
        return jsonify({'ok': False, 'error': 'bad path'}), 400
    CONTENT[page] = base
    save_content(CONTENT)
    return jsonify({'ok': True})


@app.route('/admin/api/section/<page>', methods=['POST'])
@login_required
def admin_api_section(page):
    if page not in PAGE_FIELDS:
        abort(404)
    data = request.get_json(silent=True) or {}
    action = data.get('action', '')
    if not action:
        return jsonify({'ok': False, 'error': 'no action'}), 400
    base = _load_page_base(page)
    sections = base.setdefault('sections', [])
    apply_section_action(sections, action)
    base['sections'] = sections
    CONTENT[page] = base
    save_content(CONTENT)
    return jsonify({'ok': True})


@app.route('/admin/api/batch/<page>', methods=['POST'])
@login_required
def admin_api_batch(page):
    if page not in PAGE_FIELDS:
        abort(404)
    data = request.get_json(silent=True) or {}
    updates = data.get('updates', [])
    base = _load_page_base(page)
    ok = True
    for u in updates:
        path = u.get('path', '')
        value = u.get('value', '')
        if not path:
            continue
        try:
            set_nested(base, path, value)
        except (KeyError, IndexError, TypeError):
            ok = False
    CONTENT[page] = base
    save_content(CONTENT)
    return jsonify({'ok': ok})


# ---------------------------------------------------------------------------
# NEW VISUAL EDITOR ENDPOINTS
# ---------------------------------------------------------------------------

@app.route('/admin/editor/<page>')
@login_required
def admin_editor(page):
    if page not in PAGE_FIELDS:
        abort(404)
    return render_template('admin/editor.html', page=page,
                           label=PAGE_LABELS.get(page, page),
                           labels=PAGE_LABELS,
                           pages=PAGE_FIELDS)


@app.route('/admin/api/get/<page>', methods=['GET'])
@login_required
def admin_api_get(page):
    if page not in PAGE_FIELDS:
        abort(404)
    vals = copy.deepcopy(DEFAULTS.get(page, {}))
    vals.update(CONTENT.get(page, {}))
    return jsonify({'ok': True, 'data': vals})


@app.route('/admin/api/save/<page>', methods=['POST'])
@login_required
def admin_api_save(page):
    if page not in PAGE_FIELDS:
        abort(404)
    data = request.get_json(silent=True) or {}
    page_data = data.get('page_data')
    if page_data is None:
        return jsonify({'ok': False, 'error': 'no page_data'}), 400
    # Merge with defaults to ensure no missing keys
    base = copy.deepcopy(DEFAULTS.get(page, {}))
    base.update(page_data)
    CONTENT[page] = base
    save_content(CONTENT)
    return jsonify({'ok': True})


@app.route('/admin/api/upload', methods=['POST'])
@login_required
def admin_api_upload():
    f = request.files.get('image')
    if not f or not f.filename:
        return jsonify({'ok': False, 'error': 'no file'}), 400
    fn = secure_filename(f.filename)
    if not fn:
        return jsonify({'ok': False, 'error': 'bad filename'}), 400
    save_path = os.path.join(app.config['UPLOAD_FOLDER'], fn)
    f.save(save_path)
    url = url_for('static', filename='uploads/' + fn)
    return jsonify({'ok': True, 'url': url})


@app.route('/api/chat', methods=['POST'])
def api_chat():
    data = request.get_json(silent=True) or {}
    user_msg = data.get('message', '')
    if not user_msg:
        return jsonify({'error': 'No message provided'}), 400
    
    api_key = os.environ.get('GROQ_API_KEY')
    if not api_key:
        api_key_path = os.path.join(BASE_DIR, 'api.txt')
        try:
            with open(api_key_path, 'r') as f:
                api_key = f.read().strip()
        except Exception:
            pass
    if not api_key:
        return jsonify({'error': 'AI assistant is currently unavailable. Please provide a GROQ_API_KEY environment variable or api.txt file.'}), 503
        
    def _get(page, key):
        return CONTENT.get(page, {}).get(key, '')

    def _items(page):
        rows = []
        for s in CONTENT.get(page, {}).get('sections', []):
            for it in s.get('items', []):
                if it.get('heading'):
                    rows.append(f"- {it['heading']}: {it.get('text','')}".strip(': '))
        return '\n'.join(rows[:8])

    def _stats():
        for s in CONTENT.get('about', {}).get('sections', []):
            if s.get('layout') == 'stats':
                return ', '.join(f"{it['value']} {it['label']}" for it in s.get('items', []) if it.get('value'))
        return ''

    system_prompt = f"""You are Piddy, the friendly and intellectual AI representative of PCIU Debating Forum (PCDF).
Speak naturally, warmly, and conversationally, just like a helpful club senior. 
CRITICAL RULE: Do NOT use markdown formatting like **bold** or *italics* or # headers in your responses. Keep responses in clean, readable plain text.
CRITICAL RULE: ALWAYS use double line breaks between paragraphs and bullet points so it is very easy to read on mobile and PC.
LANGUAGE SUPPORT: If the user asks in Bengali (বাংলা) or Banglish, reply warmly in natural, fluent Bengali (বাংলা) or Banglish. If they ask in English, reply in English.

Answer ONLY about PCDF based on the knowledge base below. Do NOT invent facts.

=== PCDF KNOWLEDGE BASE ===
FORUM: {_get('site','title')} — {_get('site','tagline')}
ABOUT: {_get('about','subtitle')}
STATS: {_stats()}

FEES & COSTS:
- Monthly Fee: 0 Taka (No monthly fee / সম্পূর্ন বিনামূল্যে). PCDF does not charge any monthly fee.
- Membership: Free for all selected Port City International University students.

JOINING PCDF & AUDITIONS:
1. Eligibility: All PCIU students (undergraduate & postgraduate) can join. Complete beginners with zero prior debate experience are warmly welcomed and trained from scratch!
2. Application: Applications open during the annual recruitment cycle (September). Submit interest statement or register before September 10 deadline.
3. Audition Round: A friendly 10-minute speech / impromptu debate and a short written expression.
4. Induction & Training: Selected candidates undergo a 4-week structured induction covering British Parliamentary (BP), Asian Parliamentary (AP), World Schools (WSDC), and public speaking.
5. Weekly Drills & Practice: Room 204 (Student Union), every Tuesday from 3:00 PM to 7:00 PM.

COMMITTEE & LEADERSHIP:
{_items('committee')}

EVENTS & FORMATS:
{_items('events')}

ACHIEVEMENTS:
{_items('achievements')}

LATEST NEWS:
{_items('news')}

CONTACT:
Email: debate@pciu.edu | Phone: +880 1234 567890 | Office: Student Union Room 204 | Mon-Fri 3:00 PM - 7:00 PM
==========================="""

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_msg}
    ]
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": "openai/gpt-oss-20b",
        "messages": messages,
        "max_tokens": 1024,
        "temperature": 0.7
    }
    
    try:
        resp = requests.post("https://api.groq.com/openai/v1/chat/completions", json=payload, headers=headers)
        resp.raise_for_status()
        msg_obj = resp.json()['choices'][0]['message']
        reply = msg_obj.get('content') or msg_obj.get('reasoning') or "I am here to assist you with PCIU Debating Forum queries."
        return jsonify({'reply': reply})
    except requests.exceptions.HTTPError as e:
        error_msg = f"{str(e)} - {e.response.text}"
        print(error_msg)
        return jsonify({'error': error_msg}), 500
# ---------------------------------------------------------------------------
# ARENA / DIALECTIC MANDATE ENDPOINTS
# ---------------------------------------------------------------------------
ARENA_DATA_FILE = os.path.join(BASE_DIR, 'data', 'arena_state.json')


def load_arena_state():
    if os.path.exists(ARENA_DATA_FILE):
        try:
            with open(ARENA_DATA_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading arena state: {e}")
    return {
        "active_motion_id": "motion-power-sector",
        "motions": [
            {
                "id": "motion-power-sector",
                "title": "This House Believes that the Government has Failed in the Power Sector in the State Structure",
                "category": "National Policy & Governance",
                "round": "Week 01: Parliamentary Mandate",
                "date": "August 2026",
                "status": "active",
                "info": "A parliamentary inquiry examining national grid expansion, power subsidies, capacity charges, and long-term energy sovereignty.",
                "troops": []
            }
        ]
    }


def save_arena_state(state):
    try:
        with open(ARENA_DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(state, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"Error saving arena state: {e}")


def get_active_motion(state):
    active_id = state.get('active_motion_id', 'motion-power-sector')
    motions = state.get('motions', [])
    for m in motions:
        if m.get('id') == active_id:
            return m
    if motions:
        return motions[0]
    return {
        "id": "motion-power-sector",
        "title": "This House Believes that the Government has Failed in the Power Sector in the State Structure",
        "category": "National Policy & Governance",
        "round": "Week 01: Parliamentary Mandate",
        "status": "active",
        "troops": []
    }


@app.route('/api/arena/state', methods=['GET'])
def api_arena_state():
    state = load_arena_state()
    motion_id = request.args.get('motion_id')
    
    if motion_id:
        target_motion = next((m for m in state.get('motions', []) if m.get('id') == motion_id), None)
        if not target_motion:
            target_motion = get_active_motion(state)
    else:
        target_motion = get_active_motion(state)
        
    motions_summary = [{
        "id": m.get('id'),
        "title": m.get('title'),
        "category": m.get('category'),
        "round": m.get('round'),
        "date": m.get('date'),
        "status": m.get('status', 'archived'),
        "total_votes": len(m.get('troops', [])),
        "gov_votes": len([t for t in m.get('troops', []) if t.get('side') == 'gov']),
        "opp_votes": len([t for t in m.get('troops', []) if t.get('side') == 'opp'])
    } for m in state.get('motions', [])]

    return jsonify({
        "active_motion": target_motion,
        "motions_archive": motions_summary,
        "troops": target_motion.get('troops', [])
    })


@app.route('/api/arena/vote', methods=['POST'])
def api_arena_vote():
    data = request.get_json(silent=True) or {}
    side = str(data.get('side', '')).strip().lower()
    name = str(data.get('name', '')).strip() or 'Anonymous Delegate'
    logic = str(data.get('logic', '')).strip()
    troop_class = str(data.get('troop_class', 'scholar')).strip().lower()
    target_motion_id = str(data.get('motion_id', '')).strip()

    if side not in ['gov', 'opp']:
        return jsonify({'ok': False, 'error': 'Please select a side (Government or Opposition)'}), 400
    if not logic:
        return jsonify({'ok': False, 'error': 'Argument statement is required'}), 400
    if len(logic) > 150:
        logic = logic[:150]
    if len(name) > 35:
        name = name[:35]
    if troop_class not in ['scholar', 'vanguard', 'strategist', 'debater']:
        troop_class = 'scholar'

    state = load_arena_state()
    motions = state.get('motions', [])
    
    target_motion = None
    if target_motion_id:
        target_motion = next((m for m in motions if m.get('id') == target_motion_id), None)
    if not target_motion:
        target_motion = get_active_motion(state)

    troops = target_motion.setdefault('troops', [])
    new_id = f"t-{target_motion.get('id', 'm')}-{len(troops) + 1}"
    
    new_troop = {
        "id": new_id,
        "side": side,
        "name": name,
        "troop_class": troop_class,
        "logic": logic,
        "timestamp": "Just now",
        "score": 95 + (len(logic) % 5)
    }
    troops.append(new_troop)
    if len(troops) > 100:
        target_motion['troops'] = troops[-100:]
        
    save_arena_state(state)
    return jsonify({
        'ok': True,
        'troop': new_troop,
        'active_motion': target_motion,
        'troops': target_motion.get('troops', [])
    })


@app.route('/api/arena/switch-motion', methods=['POST'])
def api_arena_switch_motion():
    data = request.get_json(silent=True) or {}
    motion_id = str(data.get('motion_id', '')).strip()
    if not motion_id:
        return jsonify({'ok': False, 'error': 'Motion ID is required'}), 400

    state = load_arena_state()
    found = any(m.get('id') == motion_id for m in state.get('motions', []))
    if not found:
        return jsonify({'ok': False, 'error': 'Motion not found'}), 404

    state['active_motion_id'] = motion_id
    save_arena_state(state)
    return jsonify({'ok': True, 'active_motion_id': motion_id})


@app.route('/api/arena/adjudicate', methods=['POST'])
def api_arena_adjudicate():
    data = request.get_json(silent=True) or {}
    motion_id = str(data.get('motion_id', '')).strip()
    user_query = str(data.get('query', '')).strip()

    state = load_arena_state()
    motions = state.get('motions', [])
    target_motion = next((m for m in motions if m.get('id') == motion_id), None) if motion_id else get_active_motion(state)
    if not target_motion:
        target_motion = get_active_motion(state)

    troops = target_motion.get('troops', [])
    gov_troops = [t for t in troops if t.get('side') == 'gov']
    opp_troops = [t for t in troops if t.get('side') == 'opp']

    api_key = os.environ.get('GROQ_API_KEY')
    if not api_key:
        api_key_path = os.path.join(BASE_DIR, 'api.txt')
        try:
            with open(api_key_path, 'r') as f:
                api_key = f.read().strip()
        except Exception:
            pass

    if not api_key:
        return jsonify({
            'ok': True,
            'verdict': f"Both benches presented competitive points on '{target_motion.get('title')}'. Government emphasized strategic infrastructure, while Opposition focused on fiscal accountability.",
            'lead_side': 'tied',
            'best_gov': gov_troops[0] if gov_troops else None,
            'best_opp': opp_troops[0] if opp_troops else None,
            'poi_questions': [
                "How does the Government reconcile short-term capacity charges with long-term industrial returns?",
                "Can the Opposition propose an alternative baseline energy matrix without imports?"
            ],
            'query_reply': "AI API key not active; standard adjudication metrics loaded."
        })

    # Prepare Groq AI Adjudicator Prompt
    gov_text = "\n".join([f"- {t.get('name')}: \"{t.get('logic')}\"" for t in gov_troops]) or "None yet"
    opp_text = "\n".join([f"- {t.get('name')}: \"{t.get('logic')}\"" for t in opp_troops]) or "None yet"

    system_prompt = """You are the Chief Adjudicator & Hard Debate Analyst of the PCIU Debating Forum (PCDF).
You strictly evaluate debate clashes using Oxford & Parliamentary adjudication criteria (Logical consistency, Empirical proof, Rebuttal delta, and Impact weighing).
Respond ONLY in valid, clean JSON with this exact schema:
{
  "verdict": "2-3 sentences of sharp adjudication ruling on who holds the floor and why.",
  "lead_side": "gov" or "opp" or "tied",
  "best_gov_name": "Name of best government debater",
  "best_gov_reason": "1 sentence why this was the strongest Government argument",
  "best_opp_name": "Name of best opposition debater",
  "best_opp_reason": "1 sentence why this was the strongest Opposition argument",
  "poi_questions": [
    "Sharp Point of Information / challenge question 1 for debaters to address",
    "Sharp Point of Information / challenge question 2 for debaters to address"
  ],
  "query_reply": "Answer to the user query if provided, or a strategic advice for debaters on this motion."
}"""

    user_prompt = f"""DEBATE MOTION: "{target_motion.get('title')}"
MOTION CONTEXT: {target_motion.get('info', '')}

GOVERNMENT ARGUMENTS (Affirmative):
{gov_text}

OPPOSITION ARGUMENTS (Negative):
{opp_text}

USER / DEBATER INQUIRY (if any):
{user_query or "Provide overall adjudication ruling and strategic challenges for both benches."}"""

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "openai/gpt-oss-120b",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "response_format": {"type": "json_object"},
        "max_tokens": 1000,
        "temperature": 0.4
    }

    try:
        resp = requests.post("https://api.groq.com/openai/v1/chat/completions", json=payload, headers=headers, timeout=12)
        resp.raise_for_status()
        raw_content = resp.json()['choices'][0]['message']['content']
        adjudication_data = json.loads(raw_content)

        # Match best debater objects
        best_gov_obj = next((t for t in gov_troops if t.get('name', '').lower() in adjudication_data.get('best_gov_name', '').lower()), gov_troops[0] if gov_troops else None)
        best_opp_obj = next((t for t in opp_troops if t.get('name', '').lower() in adjudication_data.get('best_opp_name', '').lower()), opp_troops[0] if opp_troops else None)

        return jsonify({
            'ok': True,
            'verdict': adjudication_data.get('verdict'),
            'lead_side': adjudication_data.get('lead_side', 'tied'),
            'best_gov': best_gov_obj,
            'best_gov_reason': adjudication_data.get('best_gov_reason'),
            'best_opp': best_opp_obj,
            'best_opp_reason': adjudication_data.get('best_opp_reason'),
            'poi_questions': adjudication_data.get('poi_questions', []),
            'query_reply': adjudication_data.get('query_reply')
        })
    except Exception as e:
        print(f"Adjudication AI error: {e}")
        return jsonify({
            'ok': True,
            'verdict': f"Both benches presented competitive points on '{target_motion.get('title')}'. Government emphasized strategic infrastructure, while Opposition focused on fiscal accountability.",
            'lead_side': 'gov' if len(gov_troops) > len(opp_troops) else ('opp' if len(opp_troops) > len(gov_troops) else 'tied'),
            'best_gov': gov_troops[0] if gov_troops else None,
            'best_gov_reason': "Demonstrated strong structural linkage between grid electrification and macroeconomic growth.",
            'best_opp': opp_troops[0] if opp_troops else None,
            'best_opp_reason': "Highlighted immediate taxpayer cost and contractual inefficiencies with capacity charges.",
            'poi_questions': [
                "How does the Government reconcile short-term capacity charges with long-term industrial returns?",
                "Can the Opposition propose an alternative baseline energy matrix without imports?"
            ],
            'query_reply': "The debate hinges on whether long-term capital investments outweigh short-term fiscal shocks."
        })


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)

