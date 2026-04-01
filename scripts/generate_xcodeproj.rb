#!/usr/bin/env ruby
# frozen_string_literal: true

require 'fileutils'
require 'xcodeproj'

ROOT = File.expand_path('..', __dir__)
PROJECT_PATH = File.join(ROOT, 'URight.xcodeproj')
PROJECT_NAME = 'URight'
MIN_MACOS = '14.0'

def add_sources(group, target, root_path, extension = '.swift')
  Dir.glob(File.join(root_path, '**', "*#{extension}")).sort.each do |path|
    relative = path.sub("#{root_path}/", '')
    ref = group.find_file_by_path(relative) || group.new_file(relative)
    target.source_build_phase.add_file_reference(ref, true)
  end
end

def set_target_settings(target, overrides)
  target.build_configurations.each do |config|
    config.build_settings.merge!(overrides)
  end
end

FileUtils.rm_rf(PROJECT_PATH)
project = Xcodeproj::Project.new(PROJECT_PATH)
project.root_object.attributes['LastSwiftMigration'] = '2600'

project.build_configurations.each do |config|
  config.build_settings['CLANG_ENABLE_MODULES'] = 'YES'
  config.build_settings['MACOSX_DEPLOYMENT_TARGET'] = MIN_MACOS
  config.build_settings['SDKROOT'] = 'macosx'
  config.build_settings['SWIFT_VERSION'] = '6.0'
end

main_group = project.main_group
sources_group = main_group.new_group('Sources', 'Sources')
host_group = sources_group.new_group('URightHost', 'URightHost')
extension_group = sources_group.new_group('URightFinderExtension', 'URightFinderExtension')
resources_group = main_group.new_group('Resources', 'Resources')
app_resources_group = resources_group.new_group('App', 'App')
extension_resources_group = resources_group.new_group('Extension', 'Extension')

package_ref = project.new(Xcodeproj::Project::Object::XCLocalSwiftPackageReference)
package_ref.path = '.'
package_ref.relative_path = '.'
project.root_object.package_references << package_ref

host_target = project.new_target(:application, 'URightHostApp', :osx, MIN_MACOS)
host_target.product_name = 'U-Right'
host_shared_product = project.new(Xcodeproj::Project::Object::XCSwiftPackageProductDependency)
host_shared_product.package = package_ref
host_shared_product.product_name = 'URightShared'
host_target.package_product_dependencies << host_shared_product
host_framework_build_file = project.new(Xcodeproj::Project::Object::PBXBuildFile)
host_framework_build_file.product_ref = host_shared_product
host_target.frameworks_build_phase.files << host_framework_build_file
host_target.add_system_framework('AppKit')

extension_target = project.new_target(:app_extension, 'URightFinderSync', :osx, MIN_MACOS)
extension_target.product_name = 'U-Right Finder Sync'
extension_shared_product = project.new(Xcodeproj::Project::Object::XCSwiftPackageProductDependency)
extension_shared_product.package = package_ref
extension_shared_product.product_name = 'URightShared'
extension_target.package_product_dependencies << extension_shared_product
extension_framework_build_file = project.new(Xcodeproj::Project::Object::PBXBuildFile)
extension_framework_build_file.product_ref = extension_shared_product
extension_target.frameworks_build_phase.files << extension_framework_build_file
extension_target.add_system_framework('AppKit')
extension_target.add_system_framework('FinderSync')

host_target.add_dependency(extension_target)
embed_phase = host_target.new_copy_files_build_phase('Embed App Extensions')
embed_phase.symbol_dst_subfolder_spec = :plug_ins
embed_phase.add_file_reference(extension_target.product_reference, true)

add_sources(host_group, host_target, File.join(ROOT, 'Sources/URightHost'))
add_sources(extension_group, extension_target, File.join(ROOT, 'Sources/URightFinderExtension'))

project.products_group << host_target.product_reference unless project.products_group.children.include?(host_target.product_reference)
project.products_group << extension_target.product_reference unless project.products_group.children.include?(extension_target.product_reference)

host_target.build_configurations.each do |config|
  config.build_settings['INFOPLIST_FILE'] = 'Resources/App/Info.plist'
  config.build_settings['GENERATE_INFOPLIST_FILE'] = 'NO'
  config.build_settings['PRODUCT_BUNDLE_IDENTIFIER'] = 'com.openai.uright'
  config.build_settings['PRODUCT_NAME'] = 'U-Right'
  config.build_settings['LD_RUNPATH_SEARCH_PATHS'] = '$(inherited) @executable_path/../Frameworks @executable_path/../PlugIns'
  config.build_settings['MARKETING_VERSION'] = '0.1.0'
  config.build_settings['CURRENT_PROJECT_VERSION'] = '1'
  config.build_settings['SWIFT_EMIT_LOC_STRINGS'] = 'NO'
  config.build_settings['CODE_SIGN_STYLE'] = 'Automatic'
  config.build_settings['ENABLE_APP_SANDBOX'] = 'NO'
  config.build_settings['ENABLE_HARDENED_RUNTIME'] = 'NO'
end

extension_target.build_configurations.each do |config|
  config.build_settings['INFOPLIST_FILE'] = 'Resources/Extension/Info.plist'
  config.build_settings['GENERATE_INFOPLIST_FILE'] = 'NO'
  config.build_settings['PRODUCT_BUNDLE_IDENTIFIER'] = 'com.openai.uright.findersync'
  config.build_settings['PRODUCT_NAME'] = 'U-Right Finder Sync'
  config.build_settings['CODE_SIGN_ENTITLEMENTS'] = 'Resources/Extension/URightFinderExtension.entitlements'
  config.build_settings['LD_RUNPATH_SEARCH_PATHS'] = '$(inherited) @executable_path/../../Frameworks @executable_path/../Frameworks'
  config.build_settings['MARKETING_VERSION'] = '0.1.0'
  config.build_settings['CURRENT_PROJECT_VERSION'] = '1'
  config.build_settings['SWIFT_EMIT_LOC_STRINGS'] = 'NO'
  config.build_settings['APPLICATION_EXTENSION_API_ONLY'] = 'YES'
  config.build_settings['CODE_SIGN_STYLE'] = 'Automatic'
  config.build_settings['SKIP_INSTALL'] = 'YES'
  config.build_settings['ENABLE_APP_SANDBOX'] = 'YES'
  config.build_settings['ENABLE_USER_SELECTED_FILES'] = 'readonly'
end

set_target_settings(host_target, {
  'OTHER_SWIFT_FLAGS' => '$(inherited)'
})

set_target_settings(extension_target, {
  'OTHER_SWIFT_FLAGS' => '$(inherited)'
})

project.save
puts "Generated #{PROJECT_PATH}"
