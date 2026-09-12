const fs = require('fs');
const file = '/home/aditya2003/gp-ultimate-quiz-platform/client/src/pages/QuestionBank.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  `            option_a: q.option_a || '',
            option_b: q.option_b || '',
            option_c: q.option_c || '',
            option_d: q.option_d || '',`,
  `            option_a: q.option_a || '',
            option_b: q.option_b || '',
            option_c: q.option_c || '',
            option_d: q.option_d || '',
            opt_a_image_url: q.opt_a_image_url || '',
            opt_b_image_url: q.opt_b_image_url || '',
            opt_c_image_url: q.opt_c_image_url || '',
            opt_d_image_url: q.opt_d_image_url || '',`
);

content = content.replace(
  `                                                    <div className="flex-1 overflow-x-auto">
                                                        {optText ? (
                                                            <KaTeXRenderer content={optText} />
                                                        ) : (
                                                            <span className="text-gray-600 italic">Empty option {opt.toUpperCase()}</span>
                                                        )}
                                                    </div>`,
  `                                                    <div className="flex-1 overflow-x-auto">
                                                        {optText ? (
                                                            <KaTeXRenderer content={optText} />
                                                        ) : (
                                                            <span className="text-gray-600 italic">Empty option {opt.toUpperCase()}</span>
                                                        )}
                                                        {formData[\`opt_\${opt}_image_url\`] && (
                                                            <div className="mt-2">
                                                                <img
                                                                    src={formData[\`opt_\${opt}_image_url\`].startsWith('http') ? formData[\`opt_\${opt}_image_url\`] : \`\${API_URL}\${formData[\`opt_\${opt}_image_url\`]}\`}
                                                                    alt={\`Option \${opt} image\`}
                                                                    className="max-h-20 rounded border border-white/10 shadow-sm object-contain"
                                                                />
                                                            </div>
                                                        )}
                                                    </div>`
);

fs.writeFileSync(file, content);
console.log('Fixed QuestionBank');
