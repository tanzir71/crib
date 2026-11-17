"""Shared concept set for every Crib language pack.
Each language supplies only the target text + pronunciation for these concept ids.
"""

CONCEPTS = {
    # C1 Keep it alive
    'c1.1': dict(en="I don't understand.", ctx=['work', 'travel', 'chat']),
    'c1.2': dict(en="I don't know.", ctx=['work', 'travel', 'chat']),
    'c1.3': dict(en='One moment, please.', ctx=['work', 'shops', 'phone']),
    'c1.4': dict(en='Can you say that again?', ctx=['work', 'travel', 'chat']),
    'c1.5': dict(en='Slower, please.', ctx=['travel', 'chat']),
    'c1.6': dict(en='How do you say “…”?', ctx=['everywhere']),
    # C2 React
    'c2.1': dict(en='Sure. / Of course.', ctx=['work', 'shops', 'chat']),
    'c2.2': dict(en='Exactly. / Right.', ctx=['work', 'chat']),
    'c2.3': dict(en='I think so.', ctx=['work', 'chat']),
    'c2.4': dict(en='Really?', ctx=['chat']),
    'c2.5': dict(en='No problem. / No worries.', ctx=['work', 'travel', 'chat']),
    'c2.6': dict(en='Great! / How nice!', ctx=['chat', 'family']),
    # C3 Frames ({x} = a word; {x:acc} = the word's object form where the language has one)
    'c3.1': dict(en='Where is {x}?', ctx=['travel', 'toilets'], ex='bathroom', takes='noun', fits=['place', 'work']),
    'c3.2': dict(en="I'd like {x}.", ctx=['food', 'shops'], ex='coffee', takes='noun', fits=['thing']),
    'c3.3': dict(en='Do you have {x}?', ctx=['shops', 'food'], ex='water', takes='noun', fits=['thing']),
    'c3.4': dict(en='{x}, please.', ctx=['everywhere'], ex='bill', takes='noun', fits=['thing', 'work']),
    'c3.5': dict(en='I have to {x}.', ctx=['work', 'plans'], ex='leave', takes='verb', enFixed='I have to go.'),
    'c3.6': dict(en='Can I {x}?', ctx=['work', 'travel'], ex='comein', takes='verb', enFixed='Can I come in?'),
    # Work lens
    'w.1': dict(en="I'll check it."), 'w.2': dict(en='I have a meeting.'),
    # Travel lenses
    't1.1': dict(en='Is it spicy?'), 't1.2': dict(en='Without onion, please.'), 't1.3': dict(en='What do you recommend?'), 't1.4': dict(en="I don't eat meat."),
    't2.1': dict(en='How much is it?'), 't2.2': dict(en="I'm just looking."), 't2.3': dict(en="I'll take it."), 't2.4': dict(en='Can I pay by card?'),
    't3.1': dict(en='Is it far?'), 't3.2': dict(en='To the airport, please. (taxi)'), 't3.3': dict(en='left · right · straight on', hear=True),
    't4.1': dict(en='Help!'), 't4.2': dict(en="There's no toilet paper."), 't4.3': dict(en='I feel sick.'), 't4.4': dict(en='Please call an ambulance.'),
    # Family & small talk
    'f.1': dict(en='Nice to meet you.'), 'f.2': dict(en='Where are you from?'), 'f.3': dict(en='What do you do (for work)?'), 'f.4': dict(en="It's delicious!"),
    # Basic
    'b1.1': dict(en='Hello.'), 'b1.2': dict(en='Good morning.'), 'b1.3': dict(en='How are you?'), 'b1.4': dict(en='Yes. · No.'),
    'b1.5': dict(en='Please.'), 'b1.6': dict(en='Thank you.'), 'b1.7': dict(en='Sorry. / Excuse me.'), 'b1.8': dict(en='Goodbye.'),
    'b2.1': dict(en='1 · 2 · 3'), 'b2.2': dict(en='4 · 5 · 6'), 'b2.3': dict(en='7 · 8 · 9'), 'b2.4': dict(en='10 · 20 · 100'),
    'b3.1': dict(en='The apple is red.'), 'b3.2': dict(en='I eat the apple.'), 'b3.3': dict(en='I ate the apple.'),
    'b3.4': dict(en='I want to eat the apple.'), 'b3.5': dict(en='Do you eat apples?'),
}

WORDS = {
    'bathroom': ('the bathroom', 'noun'), 'pharmacy': ('the pharmacy', 'noun'), 'hospital': ('the hospital', 'noun'),
    'station': ('the station', 'noun'), 'airport': ('the airport', 'noun'), 'hotel': ('the hotel', 'noun'),
    'water': ('water', 'noun'), 'coffee': ('a coffee', 'noun'), 'bill': ('the bill', 'noun'), 'menu': ('the menu', 'noun'),
    'beer': ('a beer', 'noun'), 'this': ('this one', 'noun'), 'bag': ('a bag', 'noun'),
    'meeting': ('the meeting', 'noun'), 'file': ('the file', 'noun'), 'screen': ('the screen', 'noun'), 'message': ('the message', 'noun'),
    'tomorrow': ('tomorrow', 'time'),
    'leave': ('go', 'verb'), 'comein': ('come in', 'verb'), 'pay': ('pay', 'verb'),
}

# What each word naturally goes with, so search only builds sensible sentences.
WORD_CAT = {**{w: 'place' for w in ['bathroom', 'pharmacy', 'hospital', 'station', 'airport', 'hotel']},
            **{w: 'thing' for w in ['water', 'coffee', 'bill', 'menu', 'beer', 'this', 'bag']},
            **{w: 'work' for w in ['meeting', 'file', 'screen', 'message']}}

# Extra English search terms, so “toilet” finds “the bathroom” and “check” finds “the bill”.
TAGS = {
    'bathroom': 'toilet restroom washroom wc loo', 'pharmacy': 'drugstore chemist medicine', 'hospital': 'doctor emergency',
    'station': 'train metro subway', 'airport': 'flight plane', 'hotel': 'room stay', 'water': 'drink', 'coffee': 'cafe drink',
    'bill': 'check pay receipt', 'menu': 'food order', 'beer': 'drink alcohol', 'this': 'that one', 'bag': 'plastic bag',
    'meeting': 'call standup zoom', 'file': 'document doc', 'screen': 'share screen', 'message': 'slack text dm', 'leave': 'leave go',
    'comein': 'enter', 'pay': 'card cash',
    'c1.3': 'wait hold on sec moment', 'c1.4': 'repeat again pardon what', 'c1.5': 'slow slowly speak', 'c1.6': 'word translate',
    'c2.1': 'yes ok okay sure course', 'c2.2': 'yes right correct agree', 'c2.5': 'welcome fine ok', 'c2.6': 'cool awesome nice',
    'c3.1': 'where find', 'c3.2': 'want like would order get', 'c3.3': 'have any got there', 'c3.4': 'please give',
    'c3.5': 'must need got', 'c3.6': 'can may could allowed', 't1.1': 'hot chili', 't1.4': 'vegetarian vegan meat', 't2.1': 'price cost how much',
    't2.4': 'credit card cash pay', 't3.2': 'taxi cab driver', 't3.3': 'directions', 't4.1': 'emergency',
    't4.3': 'ill unwell doctor', 't4.4': 'emergency doctor', 'b1.7': 'excuse me pardon apologize', 'b1.1': 'hi hey', 'b1.8': 'bye',
    'w.1': 'look into get back', 'w.2': 'busy call',
}

SHEETS = [
    dict(id='C1', mode='utility', kind='core', title='Keep it alive', blurb='The lines that rescue any conversation. You’ll use these every day, everywhere.', items=['c1.1', 'c1.2', 'c1.3', 'c1.4', 'c1.5', 'c1.6']),
    dict(id='C2', mode='utility', kind='core', title='React like you belong', blurb='Short reactions that make you sound fluent while you listen.', items=['c2.1', 'c2.2', 'c2.3', 'c2.4', 'c2.5', 'c2.6']),
    dict(id='C3', mode='utility', kind='core', title='Frames', blurb='Phrases with a blank. Drop in any word you know and you have a new sentence.', items=['c3.1', 'c3.2', 'c3.3', 'c3.4', 'c3.5', 'c3.6']),
    dict(id='W', mode='utility', kind='lens', lens='work', title='Work: Slack & meetings', blurb='Mostly lines you already know, plus two new ones and some words for your blanks.',
         core=['c1.3', 'c1.1', 'c1.2', 'c1.4', 'c2.1', 'c2.2'], items=['w.1', 'w.2'], words=['meeting', 'file', 'screen', 'message', 'tomorrow']),
    dict(id='T1', mode='utility', kind='lens', lens='travel', title='Travel: Eating out', blurb='Your frames do most of the ordering. A few new lines and some food words.',
         core=['c3.2', 'c3.4', 'c3.3', 'c1.1'], items=['t1.1', 't1.2', 't1.3', 't1.4'], words=['water', 'coffee', 'bill', 'menu', 'beer', 'this'], diet=True),
    dict(id='T2', mode='utility', kind='lens', lens='travel', title='Travel: Shopping & money', blurb='Want, have, one moment: all core. Four new lines.',
         core=['c3.2', 'c3.3', 'c1.3'], items=['t2.1', 't2.2', 't2.3', 't2.4'], words=['this', 'bag']),
    dict(id='T3', mode='utility', kind='lens', lens='travel', title='Travel: Getting around', blurb='Ask with your core frame, then understand the answer.',
         core=['c3.1', 'c1.5', 'c1.4'], items=['t3.1', 't3.2', 't3.3'], words=['station', 'airport', 'hotel']),
    dict(id='T4', mode='utility', kind='lens', lens='travel', title='Travel: Toilets, help & signs', blurb='Ask with your core frame. New: a few emergency lines and the signs you’ll see.',
         core=['c3.1', 'c3.4', 'c1.1'], items=['t4.1', 't4.2', 't4.3', 't4.4'], words=['bathroom', 'pharmacy', 'hospital'], signs=True),
    dict(id='F', mode='utility', kind='lens', lens='family', title='Family & small talk', blurb='Reactions carry the conversation. Four new lines to start one.',
         core=['c2.1', 'c2.4', 'c2.6', 'c2.3'], items=['f.1', 'f.2', 'f.3', 'f.4']),
    dict(id='B1', mode='basic', kind='basic', title='Hello & basics', blurb='Greetings, yes and no, please and thanks.', items=['b1.1', 'b1.2', 'b1.3', 'b1.4', 'b1.5', 'b1.6', 'b1.7', 'b1.8']),
    dict(id='B2', mode='basic', kind='basic', title='Numbers', blurb='Enough for prices, times and phone numbers.', items=['b2.1', 'b2.2', 'b2.3', 'b2.4']),
    dict(id='B3', mode='basic', kind='blueprint', title='Blueprint', blurb='How the language works, on one page. Spot the pattern; skip the rulebook.', items=['b3.1', 'b3.2', 'b3.3', 'b3.4', 'b3.5']),
]

DIET_EN = {
    'peanut': ('Peanut allergy', "I have a severe peanut allergy. I can't eat peanuts or peanut oil."),
    'shellfish': ('Shellfish allergy', 'I have a severe shellfish allergy (shrimp, crab, shellfish).'),
    'gluten': ('No gluten', "I can't eat gluten (wheat)."),
    'vegetarian': ('No meat or fish', "I don't eat meat, chicken or fish."),
    'pork': ('No pork', "I don't eat pork."),
}
DIET_ASK_EN = 'Does this dish contain any of these?'
