import re

with open('src/components/LandingPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update Navigation
content = content.replace(
    'const sections = ["home", "about", "features", "contact"];',
    'const sections = ["home", "features", "about", "contact"];'
)

# 2. Update Navbar links
old_nav = '''          <nav className="hidden md:flex items-center gap-8">
            <a
              href="#home"
              onClick={(e) => handleNavClick(e, "home")}
              className={`text-body font-semibold transition-colors ${
                activeSection === "home" ? "text-[#AC66DA]" : "text-[#E7E4E4] hover:text-[#AC66DA]"
              }`}
            >
              Home
            </a>
            <a
              href="#about"
              onClick={(e) => handleNavClick(e, "about")}
              className={`text-body font-semibold transition-colors ${
                activeSection === "about" ? "text-[#AC66DA]" : "text-[#E7E4E4] hover:text-[#AC66DA]"
              }`}
            >
              About
            </a>
            <a
              href="#features"
              onClick={(e) => handleNavClick(e, "features")}
              className={`text-body font-semibold transition-colors ${
                activeSection === "features" ? "text-[#AC66DA]" : "text-[#E7E4E4] hover:text-[#AC66DA]"
              }`}
            >
              Features
            </a>
            <a
              href="#contact"
              onClick={(e) => handleNavClick(e, "contact")}
              className={`text-body font-semibold transition-colors ${
                activeSection === "contact" ? "text-[#AC66DA]" : "text-[#E7E4E4] hover:text-[#AC66DA]"
              }`}
            >
              Contact
            </a>
          </nav>'''

new_nav = '''          <nav className="hidden md:flex items-center gap-8">
            <a
              href="#home"
              onClick={(e) => handleNavClick(e, "home")}
              className={`text-body font-semibold transition-colors ${
                activeSection === "home" ? "text-[#AC66DA]" : "text-[#E7E4E4] hover:text-[#AC66DA]"
              }`}
            >
              Home
            </a>
            <a
              href="#features"
              onClick={(e) => handleNavClick(e, "features")}
              className={`text-body font-semibold transition-colors ${
                activeSection === "features" ? "text-[#AC66DA]" : "text-[#E7E4E4] hover:text-[#AC66DA]"
              }`}
            >
              Features
            </a>
            <a
              href="#about"
              onClick={(e) => handleNavClick(e, "about")}
              className={`text-body font-semibold transition-colors ${
                activeSection === "about" ? "text-[#AC66DA]" : "text-[#E7E4E4] hover:text-[#AC66DA]"
              }`}
            >
              About
            </a>
            <a
              href="#contact"
              onClick={(e) => handleNavClick(e, "contact")}
              className={`text-body font-semibold transition-colors ${
                activeSection === "contact" ? "text-[#AC66DA]" : "text-[#E7E4E4] hover:text-[#AC66DA]"
              }`}
            >
              Contact
            </a>
          </nav>'''
content = content.replace(old_nav, new_nav)

# 3. Rename Bento grid to Features
content = content.replace('id="about"', 'id="features_temp"')
content = content.replace('id="features"', 'id="about"')
content = content.replace('id="features_temp"', 'id="features"')

# Update titles of the sections
content = content.replace(
    'Faster. Smarter.\n              <br />\n              Start in seconds',
    'Powerful Features'
)
content = content.replace(
    'Get started in seconds with tools that handle the heavy lifting for you.',
    'Everything you need to master your money. Smart, secure, and beautiful.'
)

# 4. Modify Bento Grid Cards (remove min-h, update screenshot div)

# Function to replace the specific card structure
def fix_card(match):
    card_html = match.group(0)
    # Remove min-h
    card_html = re.sub(r'min-h-\[\d+px\]', 'h-full', card_html)
    
    # Extract the alt from the image
    alt_match = re.search(r'alt="(.*?)"', card_html)
    src_match = re.search(r'src="(.*?)"', card_html)
    alt = alt_match.group(1) if alt_match else 'Screenshot'
    src = src_match.group(1) if src_match else '/dashboard.png'

    # Replace the screenshot block
    old_screenshot_block_pattern = r'\{\/\*\s*Screenshot visualization\s*\*\/\}.*?<\/div>'
    
    new_screenshot_block = f'''{{/* Screenshot visualization */}}
              <div className="mt-auto pt-6 relative -mx-6 -mb-6">
                <div className="border-t border-[#3a3a3a] bg-[#1a1a1a] rounded-t-2xl overflow-hidden shadow-[0_-10px_20px_rgba(0,0,0,0.3)]">
                  <Image
                    src="{src}"
                    alt="{alt}"
                    width={{800}}
                    height={{450}}
                    className="w-full h-auto block opacity-80 group-hover:opacity-100 transition-opacity duration-500"
                  />
                </div>
              </div>'''
              
    card_html = re.sub(old_screenshot_block_pattern, new_screenshot_block, card_html, flags=re.DOTALL)
    return card_html

content = re.sub(
    r'<div className="card-surface flex flex-col gap-4 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300 border border-\[\#3a3a3a\] hover:border-\[\#AC66DA\]\/30 hover:shadow-\[0_20px_40px_-5px_rgba\(172,102,218,0\.2\)\] hover:bg-\[\#2c2c2c\] min-h-\[\d+px\]">.*?</div>',
    fix_card,
    content,
    flags=re.DOTALL
)

# 5. Overwrite the "Key Features" section (which is now "about") to be a new "About Moneta" section.
old_about_section = r'\{\/\* Features Grid \(6 Cards\) \*\/\}.*?id="about" className="py-16 md:py-24 px-6 md:px-8">.*?</section>'

new_about_section = '''{/* About Section */}
      <section id="about" className="py-24 md:py-32 px-6 md:px-8 border-t border-[#2a2a2a] bg-gradient-to-b from-[#1f1f1f] to-background">
        <div className="max-w-4xl mx-auto text-center space-y-16">
          <div className="space-y-6">
            <h2 className="text-[40px] md:text-[56px] lg:text-[64px] text-[#E7E4E4] font-bold leading-tight">
              A new standard for<br/>your financial life
            </h2>
            <p className="text-body text-[#E7E4E4] opacity-70 max-w-2xl mx-auto text-lg leading-relaxed">
              We built Moneta because we were tired of financial apps that sold our data, cluttered our screens with ads, and made managing our money feel like a chore.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center bg-[#AC66DA]/10 border border-[#AC66DA]/20">
                <CheckCircle width={24} height={24} className="text-[#AC66DA]" strokeWidth={1.5} />
              </div>
              <h3 className="text-card-header text-[#E7E4E4]">Radical Clarity</h3>
              <p className="text-body text-[#E7E4E4] opacity-70">
                Your finances shouldn't require a manual. We strip away the noise so you can focus on what matters: your goals and your growth.
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center bg-[#74C648]/10 border border-[#74C648]/20">
                <Spark width={24} height={24} className="text-[#74C648]" strokeWidth={1.5} />
              </div>
              <h3 className="text-card-header text-[#E7E4E4]">Privacy First</h3>
              <p className="text-body text-[#E7E4E4] opacity-70">
                We believe your data is yours. We don't sell your information, and we don't push credit cards. Just a pure, secure experience.
              </p>
            </div>

            <div className="space-y-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center bg-[#AC66D
